# Dr Migrate TIRE Questionnaire App

An Electron-based desktop application for managing and assessing applications using the TIRE (Tolerate, Invest, Replace, Eliminate) framework.

## Features

### Data Import and Management
- Excel file upload functionality for application data
- Supports Excel files with the "App-to-Server List" sheet
- Automatically processes and displays application data including:
  - Application Name
  - Assessment Scope (In Scope/Out of Scope)
  - Data Center Location
  - Environment
  - Server Information

### Application Interface
- Clean, intuitive dashboard displaying key metrics:
  - Total number of applications
  - In Scope applications count
  - Out of Scope applications count
  - Completed assessments count
- Interactive data table with sortable columns
- Search functionality for quick application lookup
- Multiple filtering options:
  - In Scope/Out of Scope toggle
  - Completed/Uncompleted status filter
  - Combined search and filter capabilities

### TIRE Assessment
- Dedicated strategy questions interface for each application
- Comprehensive questionnaire with weighted scoring system
- Real-time calculation of TIRE placement based on responses
- Support for:
  - Initial TIRE placement
  - Confirmed TIRE placement with threshold validation
  - Extended answers and rationale capture
- Progress tracking for question completion

### Data Persistence
- Automatic saving of assessment progress
- JSON file export for completed assessments
- Local storage for application state
- Completed applications tracking
- Export functionality for completed assessments to Excel

### Visual Indicators
- Clear status indicators for completed applications
- Progress tracking for assessments
- Color-coded interface elements for status clarity
- Checkmarks and badges for completed items

## Setup

1. Install Dependencies:
```bash
npm install
```

2. Run the Application:
```bash
npm start
```

## Usage Guide

### Importing Data
1. Click "Upload Excel File" to import your application list
2. Ensure your Excel file has the required "App-to-Server List" sheet
3. The application will automatically process and display the data

### Filtering and Searching
- Use the search bar to find specific applications
- Toggle filters to show:
  - In Scope applications
  - Out of Scope applications
  - Completed assessments
  - Uncompleted assessments

### Performing Assessments
1. Click "Start Strategy Questions" for an application
2. Complete the questionnaire:
   - Answer all questions
   - Provide rationale where needed
   - Review the calculated scores
3. Set Initial TIRE Placement
4. Review Confirmed TIRE Placement (based on distribution threshold)
5. Save the assessment

### Exporting Data
- Use "Export Completed Apps" to generate an Excel file of all completed assessments
- Individual assessments are saved as JSON files
- Access completed assessments through the main interface

### Data Management
- Use "Clear Data" to reset the application state
- Completed assessments are persisted between sessions
- Application state is maintained locally

## Technical Notes
- Built with Electron.js
- Uses Node.js for file system operations
- Excel processing via xlsx library
- Local storage for application state
- JSON-based data persistence

## Requirements
- Node.js
- Electron
- Excel file with specific format (App-to-Server List sheet)
