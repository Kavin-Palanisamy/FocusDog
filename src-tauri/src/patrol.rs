use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{Emitter, Manager};

use crate::pet_window::get_work_area;
use crate::settings::load_settings;

#[derive(Debug, Clone, Serialize)]
pub struct DogMotionPayload {
    pub state: String,     // "walking" | "idle" | "sitting" | "sleeping"
    pub direction: String, // "left" | "right"
    pub speed: f32,
}

pub struct PatrolController {
    pub running: Arc<AtomicBool>,
    pub paused: Arc<AtomicBool>,
}

impl PatrolController {
    pub fn new() -> Self {
        Self {
            running: Arc::new(AtomicBool::new(false)),
            paused: Arc::new(AtomicBool::new(false)),
        }
    }
}

pub fn start_patrol_thread(app: tauri::AppHandle, controller: Arc<PatrolController>) {
    if controller.running.swap(true, Ordering::SeqCst) {
        // Already running
        return;
    }

    let running = Arc::clone(&controller.running);
    let paused = Arc::clone(&controller.paused);

    std::thread::spawn(move || {
        let mut dir: i32 = -1; // start walking left
        let mut state = "walking".to_string();
        let mut state_timer_ticks: u32 = 0;
        let mut target_state_ticks: u32 = 80; // ~4 seconds at 50ms/tick

        while running.load(Ordering::SeqCst) {
            std::thread::sleep(Duration::from_millis(50));

            let settings = load_settings(&app);
            if !settings.patrol.enabled || !settings.dog.wander_enabled || paused.load(Ordering::SeqCst) {
                // When patrol or wander is disabled or paused, keep dog idle/sitting
                let _ = app.emit(
                    "dog-motion",
                    DogMotionPayload {
                        state: "idle".to_string(),
                        direction: if dir > 0 { "right".to_string() } else { "left".to_string() },
                        speed: settings.dog.animation_speed,
                    },
                );
                continue;
            }

            let Some(pet_win) = app.get_webview_window("pet") else {
                continue;
            };

            // Only move if window is visible
            if pet_win.is_visible().unwrap_or(false) == false {
                continue;
            }

            let scale = pet_win.scale_factor().unwrap_or(1.0);
            let win_size_logical = 220.0;
            let win_size_physical = (win_size_logical * scale).round() as i32;

            let (wa_x, wa_y, wa_w, wa_h) = get_work_area();
            let target_y = wa_y + wa_h - win_size_physical;
            let min_x = wa_x + 12;
            let max_x = wa_x + wa_w - win_size_physical - 12;

            state_timer_ticks += 1;

            if state == "walking" {
                let current_pos = match pet_win.outer_position() {
                    Ok(pos) => pos,
                    Err(_) => continue,
                };

                // Speed calculation: base step * animation speed
                let step = ((1.8f32 * settings.dog.animation_speed) * (scale as f32)).round() as i32;
                let mut next_x = current_pos.x + (step * dir);

                // Boundary check
                let mut hit_boundary = false;
                if next_x <= min_x {
                    next_x = min_x;
                    dir = 1;
                    hit_boundary = true;
                } else if next_x >= max_x {
                    next_x = max_x;
                    dir = -1;
                    hit_boundary = true;
                }

                let _ = pet_win.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                    x: next_x,
                    y: target_y,
                }));

                // If hit boundary or reached walk duration, switch state
                if hit_boundary || state_timer_ticks >= target_state_ticks {
                    state_timer_ticks = 0;
                    // Choose next resting state
                    let roll = (next_x.abs() % 10) as u32;
                    if roll < 4 {
                        state = "idle".to_string();
                        target_state_ticks = 40; // 2 seconds
                    } else if roll < 8 {
                        state = "sitting".to_string();
                        target_state_ticks = 60; // 3 seconds
                    } else if settings.dog.doze_between_wanders {
                        state = "sleeping".to_string();
                        target_state_ticks = 100; // 5 seconds
                    } else {
                        state = "idle".to_string();
                        target_state_ticks = 40;
                    }
                }
            } else {
                // Resting states: idle, sitting, sleeping
                if state_timer_ticks >= target_state_ticks {
                    state_timer_ticks = 0;
                    state = "walking".to_string();
                    target_state_ticks = 100; // ~5 seconds of walking
                }
            }

            let dir_str = if dir > 0 { "right" } else { "left" };
            let _ = app.emit(
                "dog-motion",
                DogMotionPayload {
                    state: state.clone(),
                    direction: dir_str.to_string(),
                    speed: settings.dog.animation_speed,
                },
            );
        }
    });
}

#[tauri::command]
pub fn move_pet_window(window: tauri::WebviewWindow, delta_x: i32, delta_y: i32) {
    if let Ok(pos) = window.outer_position() {
        let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
            x: pos.x + delta_x,
            y: pos.y + delta_y,
        }));
    }
}