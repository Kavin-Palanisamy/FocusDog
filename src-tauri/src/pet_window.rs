use tauri::Manager;

#[cfg(windows)]
pub fn get_work_area() -> (i32, i32, i32, i32) {
    use windows_sys::Win32::Foundation::RECT;
    use windows_sys::Win32::UI::WindowsAndMessaging::{SystemParametersInfoW, SPI_GETWORKAREA};
    let mut rect = RECT {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
    };
    unsafe {
        let ok = SystemParametersInfoW(SPI_GETWORKAREA, 0, &mut rect as *mut _ as *mut _, 0);
        if ok != 0 {
            return (
                rect.left,
                rect.top,
                rect.right - rect.left,
                rect.bottom - rect.top,
            );
        }
    }
    (0, 0, 1920, 1040)
}

#[cfg(not(windows))]
pub fn get_work_area() -> (i32, i32, i32, i32) {
    (0, 0, 1920, 1040)
}

pub fn position_pet_at_bottom(
    window: &tauri::WebviewWindow,
    x_override: Option<i32>,
) -> Result<(), String> {
    let (wa_x, wa_y, wa_w, wa_h) = get_work_area();
    let scale = window.scale_factor().unwrap_or(1.0);
    let win_size_logical = 220.0;
    let win_size_physical = (win_size_logical * scale).round() as i32;

    let target_y = wa_y + wa_h - (192.0 * scale).round() as i32;
    let target_x = match x_override {
        Some(x) => x.clamp(wa_x, wa_x + wa_w - win_size_physical),
        None => wa_x + wa_w - win_size_physical - (30.0 * scale).round() as i32,
    };

    window
        .set_position(tauri::Position::Physical(tauri::PhysicalPosition {
            x: target_x,
            y: target_y,
        }))
        .map_err(|e| format!("Failed to set position: {}", e))?;

    Ok(())
}

pub fn show_settings(app: &tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("settings") {
        let _ = win.unminimize();
        let _ = win.show();
        let _ = win.set_focus();
    }
}

pub fn hide_settings(app: &tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("settings") {
        let _ = win.hide();
    }
}

pub fn show_pet(app: &tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("pet") {
        let _ = position_pet_at_bottom(&win, None);
        let _ = win.show();
    }
}

pub fn hide_pet(app: &tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("pet") {
        let _ = win.hide();
    }
}

#[tauri::command]
pub fn open_settings_window(app: tauri::AppHandle) {
    show_settings(&app);
}

#[tauri::command]
pub fn close_settings_window(app: tauri::AppHandle) {
    hide_settings(&app);
}

#[tauri::command]
pub fn show_pet_window(app: tauri::AppHandle) {
    show_pet(&app);
}

#[tauri::command]
pub fn hide_pet_window(app: tauri::AppHandle) {
    hide_pet(&app);
}

#[tauri::command]
pub fn get_desktop_work_area() -> (i32, i32, i32, i32) {
    get_work_area()
}
#[tauri::command]
pub fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

