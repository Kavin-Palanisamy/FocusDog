use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SiteRule {
    pub url: String,
    pub minutes: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatrolSettings {
    pub enabled: bool,
    #[serde(rename = "catchAction")]
    pub catch_action: String, // "close" | "complain"
    #[serde(rename = "countdownSeconds")]
    pub countdown_seconds: u32,
    #[serde(rename = "snoozeMinutes")]
    pub snooze_minutes: u32,
}

impl Default for PatrolSettings {
    fn default() -> Self {
        Self {
            enabled: true,
            catch_action: "close".to_string(),
            countdown_seconds: 5,
            snooze_minutes: 15,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FocusSettings {
    pub sites: Vec<SiteRule>,
}

impl Default for FocusSettings {
    fn default() -> Self {
        Self {
            sites: vec![
                SiteRule {
                    url: "youtube.com".to_string(),
                    minutes: 20,
                },
                SiteRule {
                    url: "instagram.com".to_string(),
                    minutes: 15,
                },
                SiteRule {
                    url: "reddit.com".to_string(),
                    minutes: 10,
                },
            ],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DogSettings {
    pub name: String,
    pub coat: String, // "cream" | "white" | "black"
    pub size: f32,
    #[serde(rename = "animationSpeed")]
    pub animation_speed: f32,
    #[serde(rename = "wanderEnabled")]
    pub wander_enabled: bool,
    #[serde(rename = "dozeBetweenWanders")]
    pub doze_between_wanders: bool,
}

impl Default for DogSettings {
    fn default() -> Self {
        Self {
            name: String::new(),
            coat: "cream".to_string(),
            size: 0.90,
            animation_speed: 1.90,
            wander_enabled: true,
            doze_between_wanders: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FocusDogSettings {
    #[serde(rename = "onboardingCompleted")]
    pub onboarding_completed: bool,
    pub patrol: PatrolSettings,
    pub focus: FocusSettings,
    pub dog: DogSettings,
}

pub fn get_settings_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let mut dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app_data_dir: {}", e))?;
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create app_data_dir: {}", e))?;
    dir.push("focusdog_settings.json");
    Ok(dir)
}

pub fn load_settings(app: &tauri::AppHandle) -> FocusDogSettings {
    if let Ok(path) = get_settings_path(app) {
        if path.exists() {
            if let Ok(content) = fs::read_to_string(&path) {
                if let Ok(settings) = serde_json::from_str::<FocusDogSettings>(&content) {
                    return settings;
                }
            }
        }
    }
    FocusDogSettings::default()
}

pub fn save_settings_to_file(
    app: &tauri::AppHandle,
    settings: &FocusDogSettings,
) -> Result<(), String> {
    let path = get_settings_path(app)?;
    let content = serde_json::to_string_pretty(settings)
        .map_err(|e| format!("Serialization error: {}", e))?;
    fs::write(&path, content).map_err(|e| format!("File write error: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn get_settings(app: tauri::AppHandle) -> FocusDogSettings {
    load_settings(&app)
}

#[tauri::command]
pub fn save_settings(app: tauri::AppHandle, settings: FocusDogSettings) -> Result<(), String> {
    save_settings_to_file(&app, &settings)
}