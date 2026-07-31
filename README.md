# 🎓 EduNova AI – Intelligent Assignment Evaluation System

> An AI-powered web application that automates assignment evaluation, provides intelligent feedback, and helps educators manage student submissions efficiently.

## 📌 Overview

**EduNova AI** is an intelligent assignment evaluation platform designed to reduce the manual effort involved in grading student assignments.

The system allows teachers or administrators to create assignments, students to submit their work, and the AI evaluation engine to analyze submissions based on the assignment requirements. The platform generates evaluation results, scores, feedback, and performance insights.

EduNova AI combines **Artificial Intelligence, Natural Language Processing, and web technologies** to provide a centralized solution for digital assignment management and automated evaluation.

---

## 🎯 Objectives

* Automate the assignment evaluation process.
* Reduce the time required for manual grading.
* Provide consistent and structured evaluation.
* Generate AI-based feedback for student submissions.
* Allow teachers and students to manage assignments digitally.
* Provide dashboards and analytics for performance tracking.
* Support multiple document formats for assignment submissions.

---

## ✨ Key Features

### 🔐 Authentication & Authorization

* Secure user registration and login.
* JWT-based authentication.
* Role-based access control.
* Separate access based on user roles.

### 📝 Assignment Management

* Create and manage assignments.
* View assignment details.
* Track assignment deadlines.
* Manage student submissions.

### 📤 Submission Management

* Upload assignment submissions.
* Support for multiple file formats:

  * `.txt`
  * `.pdf`
  * `.docx`
* Store and manage submitted assignments.

### 🤖 AI-Based Evaluation

* Automatically analyzes student submissions.
* Uses AI to evaluate assignment content.
* Generates scores and feedback.
* Performs semantic analysis of answers.
* Provides meaningful feedback based on submitted content.

### 🧠 AI Evaluation with Fallback

The system uses an AI evaluation service for intelligent grading.

If the AI service is unavailable, the application can use a **Mock Evaluator / fallback evaluation mechanism** to maintain system functionality during development and testing.

### 📊 Dashboard & Analytics

* Assignment statistics.
* Submission tracking.
* Evaluation results.
* Student performance insights.
* Data visualization using charts.

### 🔔 Notifications

* Notify users about important activities.
* Provide updates related to assignments and submissions.

### 📋 Activity Tracking

* Maintain activity logs.
* Track important user actions within the platform.

---

## 🏗️ System Architecture

```text
                    ┌─────────────────────────┐
                    │        User             │
                    │  Student / Teacher      │
                    │       / Admin           │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │     React Frontend      │
                    │   Vite + CSS + Charts   │
                    └────────────┬────────────┘
                                 │
                           REST API
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │     FastAPI Backend     │
                    │                         │
                    │  Authentication         │
                    │  Assignment Management  │
                    │  Submission Management  │
                    │  AI Evaluation          │
                    └────────────┬────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
       ┌─────────────┐    ┌──────────────┐   ┌──────────────┐
       │    MySQL    │    │  AI Service  │   │ File Parser  │
       │   Database  │    │ Gemini API   │   │ PDF / DOCX   │
       └─────────────┘    └──────────────┘   └──────────────┘
                                 │
                                 ▼
                       ┌──────────────────┐
                       │ Evaluation Result│
                       │ Score + Feedback │
                       └──────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend

* React.js
* Vite
* JavaScript
* CSS
* Recharts

### Backend

* Python
* FastAPI
* SQLAlchemy
* JWT Authentication

### Database

* MySQL

### AI & NLP

* Google Gemini API
* AI-based semantic evaluation
* Mock Evaluator fallback

### File Processing

* PyPDF
* Python-docx

### Development Tools

* Git
* GitHub
* VS Code

---

## 🗂️ Project Structure

```text
EduNova-AI/
│
├── backend/
│   ├── main.py
│   ├── models/
│   ├── schemas/
│   ├── routes/
│   ├── services/
│   │   └── gemini_service.py
│   ├── database/
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
│
├── README.md
└── .gitignore
```

---

## 🗄️ Database Models

The application uses MySQL with SQLAlchemy ORM.

Main entities include:

* **User** – Stores user authentication and role information.
* **Assignment** – Stores assignment details and requirements.
* **Submission** – Stores student assignment submissions.
* **AIEvaluation** – Stores AI-generated scores and feedback.
* **Notification** – Manages user notifications.
* **ActivityLog** – Tracks important activities performed in the system.

---

## ⚙️ How the System Works

1. The user logs into the EduNova AI platform.
2. The teacher or administrator creates an assignment.
3. The student views the available assignment.
4. The student uploads the completed assignment.
5. The backend extracts text from the submitted file.
6. The extracted content is sent to the AI evaluation service.
7. The AI analyzes the submission based on the assignment requirements.
8. The system generates:

   * Evaluation score
   * AI-generated feedback
   * Evaluation details
9. The result is stored in the MySQL database.
10. Students and teachers can view evaluation results through their dashboards.

---

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd EduNova-AI
```

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate the virtual environment on Windows:

```bash
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

### 3. Configure MySQL

Create a MySQL database:

```sql
CREATE DATABASE edunova_db;
```

Configure your database credentials in the backend environment/configuration file.

Example:

```text
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=edunova_db
```

### 4. Configure AI API

Add your AI API key to the environment configuration.

```text
GEMINI_API_KEY=your_api_key
```

> Keep API keys private and never commit them directly to GitHub.

### 5. Run the Backend

```bash
uvicorn main:app --reload
```

The backend will be available at:

```text
http://localhost:8000
```

FastAPI API documentation:

```text
http://localhost:8000/docs
```

### 6. Run the Frontend

Open a new terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend will be available at the URL displayed by Vite, typically:

```text
http://localhost:5173
```

---

## 🔒 Security

EduNova AI follows basic security practices including:

* JWT-based authentication.
* Password protection.
* Role-based authorization.
* Environment variables for sensitive configuration.
* Secure handling of API keys.
* Protected user-specific resources.

---

## 📈 Future Enhancements

* Advanced plagiarism detection.
* Multi-language assignment evaluation.
* Custom grading rubrics.
* Teacher-defined evaluation criteria.
* Advanced AI feedback generation.
* Email notifications.
* Student performance prediction.
* Learning analytics dashboard.
* Cloud deployment.
* Docker containerization.
* Integration with college Learning Management Systems.

---

## 🎓 Use Cases

EduNova AI can be used by:

* Colleges and universities.
* Schools.
* Online learning platforms.
* Teachers and educators.
* Training institutions.
* Students for self-evaluation.

---

## 🌟 Advantages

* Reduces manual grading workload.
* Saves time for educators.
* Provides faster evaluation.
* Offers consistent AI-assisted feedback.
* Supports digital assignment management.
* Centralizes assignments, submissions, and evaluations.
* Provides analytics for better academic decision-making.

---

## 📸 Screenshots

Add your project screenshots here:

```text
screenshots/
├── login.png
├── dashboard.png
├── assignment.png
├── submission.png
└── evaluation.png
```

Example:

```markdown
![Login Page](screenshots/login.png)

![Dashboard](screenshots/dashboard.png)

![AI Evaluation](screenshots/evaluation.png)
```

---

## 👩‍💻 Author

**Narmatha M**

Computer Science Engineering Student
Interested in Full-Stack Development, Java, AI, and Backend Development.

---

## 📄 License

This project is developed for educational and academic purposes.

---

## ⭐ Support

If you find this project useful, consider giving the repository a ⭐ on GitHub.
