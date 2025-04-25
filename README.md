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

## Usage

### Initial Setup

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

## Support

For issues or questions, please contact the development team.

## License

This project is proprietary software. All rights reserved.
