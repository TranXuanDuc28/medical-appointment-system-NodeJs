# Medical Appointment System - Backend API

A robust RESTful API built with Node.js and Express to power the Medical Appointment System. This backend handles user authentication, appointment scheduling, database management, and integrations for emails and document generation.

## 🌟 Key Features

- **RESTful API Architecture**: Efficient and scalable endpoints for frontend consumption.
- **ORM Integration**: Database management using Sequelize with MySQL.
- **Secure Authentication**: Password hashing using `bcryptjs`.
- **Email System**: Automated notifications for appointments and cancellations using Nodemailer.
- **Document Generation**: 
  - Dynamic PDF generation for patient records using `pdfkit`.
  - HTML-to-Image conversion for visual reports.
- **Real-time Updates**: Integrated with Socket.io for instant patient/doctor notifications.
- **File Uploads**: Secure handling of medical documents and images using Multer.
- **Modern JS**: High-performance codebase utilizing ES6+ features via Babel.

## 🚀 Technology Stack

- **Framework**: Express.js (v5)
- **Runtime**: Node.js (v22 target)
- **Database**: MySQL, Sequelize ORM
- **Authentication**: Bcryptjs
- **Messaging**: Socket.io
- **Utilities**: 
  - Axios (HTTP Client)
  - Nodemailer (Emails)
  - Puppeteer & PDFKit (Document generation)
  - Multer (File uploads)
  - Slugify, UUID, Lodash

## 🛠️ Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v22 or higher)
- [MySQL](https://www.mysql.com/)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Steps
1. **Clone the repository**:
   ```bash
   cd medical-appointment-system/backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root of the backend folder:
   ```env
   PORT=8080
   NODE_ENV=development
   DB_HOST=localhost
   DB_DATABASE_NAME=medical_db
   DB_USERNAME=root
   DB_PASSWORD=yourpassword
   DB_PORT=3306
   DB_DIALECT=mysql
   ```

4. **Database Migrations** (if using Sequelize CLI):
   ```bash
   npx sequelize-cli db:migrate
   ```

5. **Start Development Server**:
   ```bash
   npm run dev
   ```
   The API will be available at `http://localhost:8080`.

## 🏗️ Folder Structure

- `src/controllers`: Request handlers and business logic coordination.
- `src/services`: Core business logic and database interactions.
- `src/models`: Sequelize database models.
- `src/migrations`: Database schema versioning.
- `src/config`: Configuration files (Sequelize, etc.).
- `src/routes`: API route definitions.

## 📦 Scripts

- `npm run dev`: Starts the development server with `nodemon` and `babel-node`.
- `npm run build`: Compiles codebase to the `build/` directory for production.
- `npm start`: Runs the compiled app from the `build/` directory.

## 📄 License

This project is licensed under the ISC License.

---
*Developed with ❤️ by TranXuanDucIT*
