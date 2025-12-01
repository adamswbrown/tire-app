# TIRE Application Assessment Tool

A desktop application for assessing and categorizing applications based on their characteristics and requirements.

## Features

- **Application Questions**: Comprehensive questionnaire to gather detailed information about applications -- NEW  (under Testing)
- **Strategy Questions**: Assessment tool to determine application placement strategy
- **Data Management**: Save and export application assessments
- **Admin Settings**: Configure application settings and thresholds
- **Excel Integration**: Import and export data in Excel format

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the application:
   ```bash
   npm start
   ```

`## Usage

### Step-by-Step Guide: Using the Application with an App to Server Export

This guide walks you through using the TIRE Application Assessment Tool when you have an App to Server Export file from a customer.

#### Prerequisites

- An App to Server Export Excel file (.xlsx) from the customer's Dr Migrate instance
- The file should contain a sheet named "App-to-Server List" with headers in row 4
- Required columns: Application Name, Assessment Scope, Data Center, Environment, Server
- Optional columns (new format): Treatment, Solution, Other Solution

#### Step 1: Launch the Application

1. Open the TIRE Application Assessment Tool
2. You'll see the start screen with upload instructions

#### Step 2: Select Save Location

1. Click the **"Select Directory"** button
2. Choose a folder where you want to save all completed application assessments
   - This folder will store JSON files for each application's questions and answers
   - Choose a location that's easy to find and backup
   - Example: `~/Documents/TIRE-Assessments/[Customer-Name]`
3. Once selected, the directory path will be displayed
4. The **"Choose File"** button will now be enabled

#### Step 3: Upload the App to Server Export File

1. Click the **"Choose File"** button, OR
2. Drag and drop your App to Server Export Excel file onto the upload area
3. The application will:
   - Read the Excel file
   - Extract application data from the "App-to-Server List" sheet
   - Filter out "Unassociated" applications
   - Deduplicate applications (keeping the first occurrence of each application name)
   - Display a success message

**Note:** The application supports both old and new Excel formats:
- **Old format**: 9 columns (Server, Assessment Scope, Application Name, Environment, Power Status, Operating System, Data Center, SQL Detected, VMWare Description)
- **New format**: 12 columns (includes Treatment, Solution, Other Solution optional fields)

#### Step 4: Review the Application List

After upload, you'll be taken to the main dashboard showing:

- **Total Apps**: Total number of applications imported
- **In Scope**: Applications marked as "In Scope" for assessment
- **Out of Scope**: Applications marked as "Out of Scope"
- **Completed Apps**: Number of applications you've completed assessments for

The table displays:
- **Application**: Application name
- **Assessment Scope**: In Scope or Out of Scope
- **Data Center**: Data center location
- **Action**: Buttons to start assessments

#### Step 5: Filter and Search Applications

Use the filters and search to find specific applications:

- **Search box**: Type to search by application name, assessment scope, or data center
- **In Scope checkbox**: Show only in-scope applications
- **Out of Scope checkbox**: Show only out-of-scope applications
- **Completed checkbox**: Show only completed assessments
- **Uncompleted checkbox**: Show only incomplete assessments

#### Step 6: Complete Application Questions

For each application you want to assess:

1. Find the application in the table
2. Click **"Start App Questions"** (or **"View App Questions"** if already started)
3. A new window opens with the Application Questions form
4. Navigate through sections:
   - Use **"Previous Section"** and **"Next Section"** buttons to move between major sections
   - Use **"Previous"**, **"Skip"**, and **"Next"** buttons to move between individual questions
   - Use the sidebar to jump directly to any section
5. Answer questions:
   - Fill in text fields, select dropdowns, check boxes as appropriate
   - Some sections may be skipped automatically (e.g., COTS Details if app type is "In-House Custom Built")
   - Progress is tracked and displayed at the top
6. Save your progress:
   - Click **"Save"** at any time to save your answers
   - Answers are saved to JSON files in your selected directory
   - You can close and reopen to continue later
7. When finished:
   - Click **"Close"** to return to the main dashboard
   - The application will show as completed in the table

#### Step 7: Complete Strategy Questions

After completing Application Questions, determine the TIRE placement:

1. Find the application in the table (it should show as having completed App Questions)
2. Click **"Start Strategy Questions"**
3. Answer questions across multiple categories:
   - Performance and stability
   - User satisfaction
   - Criticality
   - Scalability
   - Cost/value
   - Architecture
   - Modernization potential
   - Legacy/tech debt
   - Security
   - Competitive advantage
   - Integration
4. Review the scoring:
   - Each answer contributes to a weighted score
   - Scores are calculated automatically
   - Distribution percentages show across TIRE categories
5. Set placement:
   - Review the **Initial TIRE Placement** recommendation
   - If needed, select a different **Confirmed TIRE Placement**
   - Add notes explaining your decision
6. Save and close:
   - Click **"Save"** to save the strategy assessment
   - The application will show as fully completed

#### Step 8: Export Results

Once you've completed assessments:

1. Click **"Export Completed Apps"** to export all completed applications to Excel
   - This creates a file with application names and their TIRE placements
   - Useful for reporting and analysis
2. Click **"Export App Questions"** to export all application question answers
   - Creates a comprehensive Excel file with all question responses
   - Useful for detailed analysis and documentation

#### Step 9: Continue with Remaining Applications

Repeat Steps 6-7 for each application you need to assess:

- Work through applications systematically
- Use filters to focus on in-scope applications first
- Track progress using the completion metrics
- Save frequently to avoid losing work

#### Step 10: Clear Data (Optional)

If you need to start fresh with a new customer or dataset:

1. Click **"Clear Data"**
2. Confirm the action in the modal dialog
3. You'll be returned to the start screen
4. Upload a new App to Server Export file

**Warning:** This action cannot be undone and will clear all imported data and assessments.

---

### Alternative Setup Method

If you prefer to configure settings first:

1. Launch the application
2. Set the directory for saving completed applications in the admin settings
3. Import your application list using the Excel template

### Application Questions

The Application Questions section gathers detailed information about each application through a structured questionnaire:

#### Sections
1. **Application Details**
   - Basic application information
   - Application type (COTS/ISV or In-House Custom Built)
   - Migration drivers and requirements

2. **Technical Assessment**
   - Architecture and design
   - Performance characteristics
   - Integration points
   - Security considerations

3. **Business Impact**
   - User base and criticality
   - Business value
   - Cost considerations
   - Strategic importance

#### Features
- Dynamic question flow based on application type
- Automatic section skipping for irrelevant questions
- Progress tracking and completion status
- Save and resume functionality
- Export capabilities

### Strategy Questions

The Strategy Questions section determines the application's placement strategy using the TIRE framework:

#### TIRE Categories
- **Tolerate**: Applications that meet current needs and require minimal changes
- **Invest**: Applications with potential for improvement and modernization
- **Replace**: Applications that need significant changes or replacement
- **Eliminate**: Applications that are no longer needed

#### Assessment Process
1. **Question Categories**
   - Performance and stability
   - User satisfaction
   - Criticality
   - Scalability
   - Cost/value
   - Architecture
   - Modernization potential
   - Legacy/tech debt
   - Security
   - Competitive advantage
   - Integration

2. **Scoring System**
   - Weight-based scoring (1-5 scale)
   - Yes/No/Partial answer options
   - Extended answer fields for rationale
   - Automatic score calculation
   - Distribution percentage calculations

3. **Placement Determination**
   - Distribution threshold (configurable, default 80%)
   - Tiebreak threshold (configurable, default 3%)
   - Initial and confirmed placement options
   - Assessment history tracking

### Data Management

- **Save**: Application data is automatically saved in the configured directory
- **Export**: Export completed assessments to Excel format
- **Import**: Import application lists from Excel files

## File Structure

- `app-questions.json`: Contains the application assessment questions
- `strategy-questions.json`: Contains the strategy assessment questions
- `completed-apps/`: Directory for saved application assessments
- `templates/`: Contains Excel templates for import/export

## Configuration

### Admin Settings

- **Distribution Threshold**: Configure the threshold for application distribution
- **Tiebreak Threshold**: Configure the threshold for tiebreak decisions
- **Save Directory**: Set the directory for saving completed applications
`
## Development

### Project Structure

- `main.js`: Main process file
- `app-questions.js`: Application questions logic
- `strategy-questions.js`: Strategy questions logic
- `admin.js`: Admin settings logic
- `index.html`: Main window
- `app-questions.html`: Application questions window
- `strategy-questions.html`: Strategy questions window
- `admin.html`: Admin settings window

### Building

To build the application:

```bash
npm run build
```

---

## Quick Reference

### File Format Requirements

**App to Server Export File:**
- Must be an Excel file (.xlsx)
- Must contain a sheet named exactly: `App-to-Server List`
- Headers must be in row 4 (first data row is row 5)
- Required columns:
  - Application Name
  - Assessment Scope
  - Data Center
  - Environment
  - Server
- Optional columns (new format):
  - Treatment (optional)
  - Solution (optional)
  - Other Solution - if applicable (optional)
  - Power Status
  - Operating System
  - SQL Detected
  - VMWare Description

### Common Workflows

**Assessing a Single Application:**

1. Upload App to Server Export
2. Search/filter to find the application
3. Click "Start App Questions" → Complete → Close
4. Click "Start Strategy Questions" → Complete → Close
5. Export results if needed

**Assessing Multiple Applications:**
1. Upload App to Server Export
2. Filter to "In Scope" and "Uncompleted"
3. Work through applications one by one
4. Use "Export Completed Apps" periodically to backup progress

**Reviewing Previous Assessments:**
1. Applications with completed assessments show "View App Questions" / "View Strategy Results"
2. Click to reopen and review/edit answers
3. Changes are saved automatically

### Troubleshooting

**File won't upload:**

- Verify the Excel file has a sheet named "App-to-Server List" (case-sensitive)
- Check that headers are in row 4
- Ensure required columns are present

**Applications not showing:**
- Check that "Application Name" column has values
- Verify applications aren't filtered out (check filter checkboxes)
- Applications named "Unassociated" are automatically excluded

**Can't save:**
- Ensure you've selected a save directory in Step 2
- Check that the directory is writable
- Verify you have sufficient disk space

**Questions window won't open:**
- Ensure the application name is valid
- Try closing and reopening the application
- Check console for error messages

## Support

For issues or questions, please contact the development team.

## License

This project is proprietary software. All rights reserved.
