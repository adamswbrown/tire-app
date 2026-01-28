
## Overview\
Convert the existing TIREApp into a modern web application to provide users with an accessible, browser-based interface for managing tire-related questions, strategies, and calculations.\
\
## Features\
- Web-based user interface for all current TIREApp functionality\
- Interactive question flows (app-questions, strategy-questions)\
- Calculation explanations and validation checks\
- Admin panel for managing questions and strategies\
- User-friendly navigation between modules (start, in-scope, calculations, etc.)\
- Responsive design for desktop and mobile browsers\
- Data persistence (local storage or backend API, depending on phase)\
- Migration of all current HTML/JS functionality to a unified web app\
\
## Tech Stack\
- React (with Vite or Next.js) or Vanilla JS (if minimal rewrite preferred)\
- Modern CSS (CSS Modules or Tailwind, or keep styles.css if compatible)\
- Node.js backend (optional, for future API/data storage)\
- LocalStorage or simple backend for data persistence (phase 1)\
- Deployment: Vercel (primary), local development support\
\
## Migration Notes\
- All current HTML/JS modules (e.g., app-questions.html/js, strategy-questions.html/js) will be refactored into React components or single-page app routes.\
- Existing logic in main.js, preload.js, and renderer.js will be adapted for the web context.\
- Admin and user flows will be accessible via web navigation.\
- Python scripts (e.g., validation_check.py) will be reviewed for possible backend integration or converted to JS if feasible.}

Also review today.md for current focus of the applicaiton and user journey that needs to be replicated.