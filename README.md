# Dr Migrate TIRE Questionnaire App

An Electron-based desktop application for managing and assessing applications using the TIRE (Tolerate, Invest, Replace, Eliminate) framework.

## Features

### Data Import and Management
- Excel file upload functionality for application data
- Supports Excel files with the "App-to-Server List" sheet
- Automatic data processing and validation
- Clear data functionality with confirmation
- Export completed assessments to Excel format

### Dashboard Interface
- Modern, clean dashboard with real-time metrics:
  - Total applications count
  - In Scope applications count
  - Out of Scope applications count
  - Completed assessments count
- Interactive data table with:
  - Application name
  - Assessment scope
  - Data center location
  - Action buttons
- Color-coded status indicators
- Green "View Results" button for completed assessments

### Search and Filtering
- Real-time search functionality across all fields
- Multiple filter combinations:
  - In Scope/Out of Scope toggle
  - Completed/Uncompleted status
  - Category-based filtering
  - Reset Filters button with visual separator
- Combined search and filter capabilities
- Persistent filter state

### TIRE Assessment Interface
- Comprehensive questionnaire with:
  - Question categories
  - Weight-based scoring (1-5 scale)
  - Client answer options (Yes/No/Partial)
  - Extended answer fields
  - Sample drivers
- Category-based filtering with:
  - Performance/stability
  - User satisfaction
  - Criticality
  - Scalability
  - Cost/value
  - Architecture
  - Modernisation
  - Legacy/tech debt
  - Security
  - Competitive advantage
  - Integration

### Real-time Calculations
- Automatic score calculation based on answers
- Distribution percentage calculations
- Dynamic TIRE placement determination
- Threshold-based validation (80% default)
- Visual indicators for threshold achievement

### Summary Dashboard
- Category-wise score breakdown
- Distribution percentages
- Total possible scores
- Client scores
- Highlighted rows for threshold achievement

### Progress Tracking
- Question completion counter
- Visual progress indicators
- Completion status banner
- Timestamp for completed assessments

### Action Buttons
- "Start Strategy Questions" for new assessments
- "View Results" for completed assessments
- "Complete Strategy Questions" functionality
- "Calculations Explained" popup with detailed methodology
- "Clear Data" with danger styling

### Data Persistence
- Automatic saving of assessment progress
- JSON file export for completed assessments
- Local storage for application state
- Completed applications tracking
- Export functionality for completed assessments

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
1. Use the search bar for real-time filtering
2. Toggle filters as needed:
   - In Scope/Out of Scope
   - Completed/Uncompleted
   - Category filters
3. Use Reset Filters to clear all filters
4. Combine multiple filters for precise results

### Performing Assessments
1. Click "Start Strategy Questions" for an application
2. Complete the questionnaire:
   - Select appropriate answers (Yes/No/Partial)
   - Provide detailed rationale in extended answer fields
   - Review sample drivers for guidance
   - Monitor completion progress
3. Review the summary dashboard:
   - Check category scores
   - Monitor distribution percentages
   - Verify threshold achievement
4. Set Initial TIRE Placement
5. Review Confirmed TIRE Placement
6. Complete assessment using "Complete Strategy Questions"

### Viewing Results
1. Access completed assessments via "View Results"
2. Review summary statistics
3. Export data as needed
4. Check completion timestamps

### Data Management
1. Use "Clear Data" to reset application state (red button)
2. Export completed assessments to Excel
3. Save individual assessments as JSON
4. Track completion status across sessions

## Technical Details
- Built with Electron.js
- Node.js backend
- Excel processing via xlsx library
- Local storage for state management
- JSON-based data persistence
- CSS variables for consistent styling
- Responsive design support

## Example: Completing an Assessment

### Step 1: Starting the Assessment
1. From the main dashboard, locate your application (e.g., "CRM System")
2. Click the "Start Strategy Questions" button next to the application name
3. The assessment interface will open with the application name at the top

### Step 2: Answering Questions
Here's an example of how to answer questions for the CRM System:

#### Performance/Stability Category
```
Q: "Is the application performing well with current load?"
- Select: "Yes"
- Weight: 4
- Extended Answer: "Application handles 1000+ concurrent users with response times < 2s"
Score: 4 points (Yes × Weight 4)
```

#### Cost/Value Category
```
Q: "Are maintenance costs within acceptable range?"
- Select: "Partial/Unsure"
- Weight: 3
- Extended Answer: "Current costs are $50K/month, slightly above target of $45K"
Score: 1.5 points (Partial × Weight 3)
```

#### Security Category
```
Q: "Does the application meet current security standards?"
- Select: "No"
- Weight: 5
- Extended Answer: "Missing MFA and requires security patch updates"
Score: 0 points (No × Weight 5)
```

### Step 3: Using Category Filters
1. Click "Security" in the category filters to focus on security-related questions
2. Answer all security questions
3. Click "Cost/value" to move to cost-related questions
4. Use "Reset Filters" to see all questions again

### Step 4: Monitoring Progress
Watch the completion header which shows:
```
35/40 questions answered
Distribution scores:
- Tolerate: 85%
- Invest: 45%
- Replace: 30%
- Eliminate: 20%
```

### Step 5: Setting TIRE Placement
1. Review the summary dashboard
2. If Tolerate shows 85% (above 80% threshold):
   - Set Initial TIRE Placement to "Tolerate"
   - System will automatically set Confirmed TIRE Placement to "Tolerate"

### Step 6: Saving the Assessment
1. Click "Complete Strategy Questions"
2. Choose save location (e.g., "assessments/crm_system_assessment.json")
3. File will save with:
   - All question answers
   - Extended answers
   - Score calculations
   - TIRE placements
   - Completion timestamp

### Step 7: Verification
1. Return to main dashboard
2. CRM System will now show:
   - Green "View Results" button
   - Completed status
   - Timestamp of completion

### Example Output File Structure
```json
{
  "applicationName": "CRM System",
  "initialTimePlacement": "Tolerate",
  "confirmedTimePlacement": "Tolerate",
  "completedOn": "2024-03-20T14:30:00.000Z",
  "answers": [
    {
      "category": "Performance/Stability",
      "question": "Is the application performing well with current load?",
      "clientAnswer": "Yes",
      "weight": 4,
      "clientScore": 4,
      "extendedAnswer": "Application handles 1000+ concurrent users with response times < 2s"
    },
    {
      "category": "Cost/Value",
      "question": "Are maintenance costs within acceptable range?",
      "clientAnswer": "Partial/Unsure",
      "weight": 3,
      "clientScore": 1.5,
      "extendedAnswer": "Current costs are $50K/month, slightly above target of $45K"
    }
  ],
  "summary": {
    "tolerate": {
      "score": 85,
      "total": 100,
      "distribution": "85%"
    }
  }
}
```

## Requirements
- Node.js
- Electron
- Excel file with "App-to-Server List" sheet
- Local storage access
- File system permissions
