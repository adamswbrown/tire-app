# Dr Migrate TIRE App Release Notes

## Version 1.0.2

### What's New
- Added configurable save directory for completed applications
- Enhanced export functionality with user-selected directory support
- Improved logging system with daily log files
- Added confirmation modal for application reset
- Enhanced close button functionality in strategy questions window
- Added comprehensive logging throughout the application
- Improved error handling and user feedback
- Enhanced cross-platform directory handling

### Bug Fixes
- Fixed issues with file saving in custom directories
- Improved error handling for directory operations
- Enhanced application state management
- Fixed window management and focus handling
- Improved IPC communication reliability

### Technical Improvements
- Added structured logging system with timestamp and log levels
- Enhanced directory management with proper permissions
- Improved application state persistence
- Added robust error handling for file operations
- Enhanced cross-platform compatibility

## Version 1.0.1

### What's New
- Enhanced cross-platform compatibility for file operations
- Improved error handling for file saving operations
- Added platform-specific path handling
- Enhanced user data directory management
- Improved thresholds.json and questions.json file handling
- Added automatic userData directory creation with proper permissions
- Enhanced error messaging for file operations
- Implemented secure file writing with temporary file approach
- Added platform-specific error handling for both Windows and macOS
- Improved modal layout with accordion sections
- Enhanced calculations explanation interface
- Enhanced error handling for settings persistence

### Bug Fixes
- Fixed file permission issues on macOS
- Improved error handling for file operations
- Enhanced cross-platform path handling
- Fixed potential data loss during file saves
- Improved error messaging for failed operations

---

## Version 1.0.0

### New Features
- Initial release of the TIRE Assessment application
- Cross-platform support for Windows and Mac (ARM64)
- Excel file upload with automatic data processing
- Comprehensive TIRE assessment questionnaire with 40 questions
- Real-time scoring and distribution calculations
- Dynamic TIRE placement determination
- Configurable thresholds through admin settings
- Export capabilities for completed assessments
- Assessment history tracking

### Core Functionality
- **Dashboard Features**
  - Real-time metrics display
  - Application status tracking
  - Advanced search and filtering
  - Completed assessments overview

- **Assessment Interface**
  - Category-based question organization
  - Weight-based scoring (1-5 scale)
  - Extended answer support
  - Sample drivers for guidance
  - Real-time distribution calculations

- **Admin Settings**
  - Distribution Threshold configuration (default: 80%)
  - Tiebreak Threshold adjustment (default: 3%)
  - Real-time threshold updates

### Technical Improvements
- Modern Electron-based architecture
- Responsive UI with real-time updates
- Platform-specific file handling
- Secure data storage
- Efficient Excel processing
- Automatic backup mechanisms
- JSON-based data persistence
- Excel export functionality
- Comprehensive assessment history
- Automatic data validation
- Cross-platform compatibility

### Installation
#### Windows
1. Download the `.exe` file from the latest release
2. Run the installer
3. No additional setup required

#### Mac
1. Download the `.zip` file for ARM64
2. Extract the application
3. Move to Applications folder
4. First launch: Right-click and select "Open"

### System Requirements
- Windows 10 or later
- macOS 11.0 (Big Sur) or later
- Minimum 4GB RAM
- 100MB available disk space 