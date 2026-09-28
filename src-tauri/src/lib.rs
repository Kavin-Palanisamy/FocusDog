mod browser_bridge;
mod patrol;
mod pet_window;
mod settings;
mod tray;

use std::sync::Arc;
use tauri::Manager;

use browser_bridge::BrowserBridge;
use patrol::{start_patrol_thread, PatrolController};
use pet_window::{hide_settings, show_pet, show_settings};
use settings::{load_settings, save_settings_to_file, FocusDogSettings};

struct AppState {
    patrol_ctrl: Arc<PatrolController>,
}

#[tauri::command]
fn send_browser_command(command: browser_bridge::BrowserCommandPayload) -> Result<bool, String> {
    if command.cmd_type != "CLOSE_TAB" {
        return Err("Unsupported command type".into());
    }
    let b = command.browser.to_lowercase();
    if b != "chrome" && b != "edge" {
        return Err("Unsupported browser".into());
    }
    if command.tab_id <= 0 {
        return Err("Invalid tab ID".into());
    }
    browser_bridge::queue_browser_command(command);
    Ok(true)
}

#[tauri::command]
fn save_settings_and_start(
    app: tauri::AppHandle,
    mut settings: FocusDogSettings,
) -> Result<(), String> {
    settings.onboarding_completed = true;
    save_settings_to_file(&app, &settings)?;

    hide_settings(&app);
    show_pet(&app);

    let state = app.state::<AppState>();
    start_patrol_thread(app.clone(), Arc::clone(&state.patrol_ctrl));

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let patrol_ctrl = Arc::new(PatrolController::new());
    let patrol_ctrl_for_tray = Arc::clone(&patrol_ctrl);
    let patrol_ctrl_for_setup = Arc::clone(&patrol_ctrl);

    tauri::Builder::default()
        .manage(AppState { patrol_ctrl })
        .plugin(tauri_plugin_opener::init())
        .setup(move |app| {
            let handle = app.handle();
            let _ = tray::setup_tray(handle, patrol_ctrl_for_tray);

            let bridge = BrowserBridge::new();
            bridge.start(handle.clone());

            let settings = load_settings(handle);

            if settings.onboarding_completed {
                show_pet(handle);
                start_patrol_thread(handle.clone(), patrol_ctrl_for_setup);
            } else {
                show_settings(handle);
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "settings" {
                    // Prevent quitting the app on closing settings; hide instead
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            settings::get_settings,
            settings::save_settings,
            save_settings_and_start,
            pet_window::open_settings_window,
            pet_window::close_settings_window,
            pet_window::show_pet_window,
            pet_window::hide_pet_window,
            pet_window::get_desktop_work_area,
            pet_window::quit_app,
            patrol::move_pet_window,
            send_browser_command
        ])
        .run(tauri::generate_context!())
        .expect("error while running FocusDog application");
}