use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

pub const BRIDGE_PORT: u16 = 42123;
pub const MAX_PAYLOAD_BYTES: usize = 65536; // 64 KB limit

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserActivityPayload {
    #[serde(rename = "type")]
    pub msg_type: String,
    pub browser: String,
    pub url: Option<String>,
    pub title: Option<String>,
    pub focused: Option<bool>,
    #[serde(rename = "tabId", alias = "tab_id")]
    pub tab_id: Option<i64>,
    pub timestamp: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserCommandPayload {
    #[serde(rename = "type")]
    pub cmd_type: String,
    pub browser: String,
    #[serde(rename = "tabId", alias = "tab_id")]
    pub tab_id: i64,
}

static COMMAND_QUEUE: Mutex<Vec<BrowserCommandPayload>> = Mutex::new(Vec::new());

pub fn queue_browser_command(cmd: BrowserCommandPayload) {
    if let Ok(mut q) = COMMAND_QUEUE.lock() {
        println!("[BrowserBridge] Queuing command: type={}, browser={}, tabId={}", cmd.cmd_type, cmd.browser, cmd.tab_id);
        q.push(cmd);
    }
}

pub fn pop_browser_commands(browser_filter: Option<&str>) -> Vec<BrowserCommandPayload> {
    if let Ok(mut q) = COMMAND_QUEUE.lock() {
        if let Some(b) = browser_filter {
            let (matching, remaining): (Vec<_>, Vec<_>) = q.drain(..).partition(|c| c.browser.eq_ignore_ascii_case(b));
            *q = remaining;
            matching
        } else {
            q.drain(..).collect()
        }
    } else {
        Vec::new()
    }
}

pub struct BrowserBridge {
    running: Arc<AtomicBool>,
}

impl BrowserBridge {
    pub fn new() -> Self {
        Self {
            running: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn start(&self, app_handle: AppHandle) {
        if self.running.load(Ordering::SeqCst) {
            return;
        }
        self.running.store(true, Ordering::SeqCst);
        let running = Arc::clone(&self.running);

        thread::spawn(move || {
            let bind_addr = format!("127.0.0.1:{}", BRIDGE_PORT);
            let listener = match TcpListener::bind(&bind_addr) {
                Ok(l) => {
                    println!("[BrowserBridge] Listening on {}", bind_addr);
                    l
                }
                Err(e) => {
                    eprintln!("[BrowserBridge] Failed to bind to {}: {}", bind_addr, e);
                    return;
                }
            };

            let _ = listener.set_nonblocking(true);

            while running.load(Ordering::SeqCst) {
                match listener.accept() {
                    Ok((stream, _)) => {
                        let app = app_handle.clone();
                        thread::spawn(move || {
                            handle_client(stream, app);
                        });
                    }
                    Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                        thread::sleep(Duration::from_millis(50));
                    }
                    Err(e) => {
                        eprintln!("[BrowserBridge] Accept error: {}", e);
                        thread::sleep(Duration::from_millis(100));
                    }
                }
            }
        });
    }

    #[allow(dead_code)]
    pub fn stop(&self) {
        self.running.store(false, Ordering::SeqCst);
    }
}

fn handle_client(stream: TcpStream, app_handle: AppHandle) {
    let _ = stream.set_read_timeout(Some(Duration::from_secs(5)));
    let _ = stream.set_write_timeout(Some(Duration::from_secs(5)));

    let mut stream_write = match stream.try_clone() {
        Ok(s) => s,
        Err(_) => return,
    };

    let mut reader = BufReader::new(stream);
    let mut initial_line = String::new();

    if reader.read_line(&mut initial_line).is_err() || initial_line.is_empty() {
        return;
    }

    if initial_line.starts_with("GET ") || initial_line.starts_with("POST ") || initial_line.starts_with("OPTIONS ") {
        handle_http_request(initial_line, &mut reader, &mut stream_write, app_handle);
    } else {
        handle_raw_json_line(&initial_line, app_handle);
    }
}

fn handle_http_request(
    first_line: String,
    reader: &mut BufReader<TcpStream>,
    stream: &mut TcpStream,
    app_handle: AppHandle,
) {
    let mut content_length: usize = 0;

    // Read HTTP headers
    loop {
        let mut header_line = String::new();
        match reader.read_line(&mut header_line) {
            Ok(0) | Err(_) => break,
            Ok(_) => {
                let trimmed = header_line.trim();
                if trimmed.is_empty() {
                    break;
                }
                if trimmed.to_lowercase().starts_with("content-length:") {
                    if let Some(val) = trimmed.split(':').nth(1) {
                        content_length = val.trim().parse::<usize>().unwrap_or(0);
                    }
                }
            }
        }
    }

    // Handle GET /commands?browser={chrome|edge}
    if first_line.starts_with("GET /commands") {
        let browser_filter = if first_line.contains("browser=chrome") {
            Some("chrome")
        } else if first_line.contains("browser=edge") {
            Some("edge")
        } else {
            None
        };
        let commands = pop_browser_commands(browser_filter);
        let body = serde_json::to_string(&commands).unwrap_or_else(|_| "[]".to_string());
        let resp = format!(
            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n{}\r\n",
            body
        );
        let _ = stream.write_all(resp.as_bytes());
        return;
    }

    // Handle GET status / health
    if first_line.starts_with("GET ") {
        let resp = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n{\"status\":\"ok\",\"service\":\"focusdog\"}\r\n";
        let _ = stream.write_all(resp.as_bytes());
        return;
    }

    // Handle OPTIONS CORS preflight
    if first_line.starts_with("OPTIONS ") {
        let resp = "HTTP/1.1 204 No Content\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, POST, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type\r\nConnection: close\r\n\r\n";
        let _ = stream.write_all(resp.as_bytes());
        return;
    }

    // Guard against oversized payload
    if content_length > MAX_PAYLOAD_BYTES {
        let resp = "HTTP/1.1 413 Payload Too Large\r\nConnection: close\r\n\r\n";
        let _ = stream.write_all(resp.as_bytes());
        return;
    }

    // Read body
    let mut body_bytes = vec![0u8; content_length];
    if content_length > 0 && reader.read_exact(&mut body_bytes).is_ok() {
        if let Ok(body_str) = String::from_utf8(body_bytes) {
            validate_and_emit(&body_str, &app_handle);
        }
    }

    let resp = "HTTP/1.1 200 OK\r\nAccess-Control-Allow-Origin: *\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n{\"status\":\"ok\"}";
    let _ = stream.write_all(resp.as_bytes());
}

fn handle_raw_json_line(line: &str, app_handle: AppHandle) {
    validate_and_emit(line.trim(), &app_handle);
}

fn validate_and_emit(json_str: &str, app_handle: &AppHandle) {
    if json_str.is_empty() || json_str.len() > MAX_PAYLOAD_BYTES {
        return;
    }

    if let Ok(payload) = serde_json::from_str::<BrowserActivityPayload>(json_str) {
        if payload.msg_type != "ACTIVE_TAB_CHANGED" {
            return;
        }

        let b = payload.browser.to_lowercase();
        if b != "chrome" && b != "edge" {
            return;
        }

        println!("[BrowserBridge] Emitting activity: browser={}, url={:?}, focused={:?}, tabId={:?}", payload.browser, payload.url, payload.focused, payload.tab_id);
        let _ = app_handle.emit("browser-activity", &payload);
    }
}
