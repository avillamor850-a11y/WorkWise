<p align="center"><a href="https://work-wise.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Work-Wise Logo"></a></p>

# Work-Wise: Premium AI Freelance Marketplace

**Work-Wise** is a premium, AI-driven freelance marketplace designed to connect skilled gig workers with employers looking for high-quality talent. The platform prioritizes security, efficiency, and user experience through advanced features like real-time AI matching, a robust fraud detection system, and integrated escrow payments.

---

## 🚀 Quick Start

### 1. Prerequisites
- PHP 8.2+
- Node.js & NPM
- Composer
- Supabase Account
- Stripe Account

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/your-repo/work-wise.git

# Install dependencies
composer install
npm install

# Setup environment
cp .env.example .env
php artisan key:generate

# Run migrations and seed data
php artisan migrate --seed

# Build assets and start dev server
npm run dev
php artisan serve
```

---

## 🛡️ Core Features

### 1. AI-Powered Matching & Recommendations
*   **Intelligent Job Matching:** Automatically recommends jobs to gig workers and candidates to employers based on skills, experience, and historical performance.
*   **Dynamic Skill Taxonomy:** Uses an AI-backed system to suggest and validate skills during onboarding and job creation.
*   **"Best for Me" Logic:** A personalized discovery engine that prioritizes the most relevant opportunities for each user.

### 2. Advanced Fraud Detection System
*   **Real-Time Risk Scoring:** Analyzes behavior patterns (IP, device, velocity, transaction size) to assign risk scores (0-100).
*   **Automated Responses:** Triggers immediate actions based on risk levels, ranging from enhanced logging to mandatory KYC or instant blocking.
*   **Admin Oversight:** A dedicated fraud dashboard for investigating cases, reviewing alerts, and managing watchlists.
*   **Immutable Audit Logs:** Secure tracking of all sensitive actions for forensic analysis.

### 3. Secure Financial Ecosystem
*   **Stripe Integration:** Seamless payment processing for deposits, payouts, and platform fees.
*   **Escrow Service:** Securely holds funds until project milestones are achieved and approved.
*   **Role-Specific Wallets:** Dedicated interfaces for employers to manage deposits and for workers to track earnings.
*   **Financial Reporting:** Automated VAT invoice generation (PDF) and detailed transaction history.

### 4. Identity & Trust (KYC)
*   **Multi-Step Onboarding:** Tailored registration flows for gig workers and employers.
*   **ID Verification:** Integrated KYC process requiring government-issued IDs for high-risk accounts or specific features.
*   **Performance Metrics:** Transparent star ratings and reviews to build platform credibility.

### 5. Project & Contract Management
*   **Digital Contracts:** Legally binding agreements with digital signature support and PDF export.
*   **Milestone Tracking:** Clear project phases with approval-based payment releases.
*   **Job Templates:** Streamlined job creation for employers using saved configurations.

### 6. Communication & Collaboration
*   **Rich Messaging:** Real-time chat with support for file attachments and conversation context.
*   **Notification System:** Multi-channel alerts (in-app, email) for bids, payments, and project updates.
*   **Activity Heartbeat:** Real-time presence and status tracking.

### 7. Premium User Experience (UX)
*   **Instant Client-Side Filtering:** Lightning-fast job and candidate discovery using `useMemo` for zero-latency results.
*   **Glassmorphic Design:** A modern, high-end aesthetic featuring backdrop blurs, subtle rings, and deep shadows (up to `shadow-2xl`).
*   **Visual Hierarchy:** Clear elevation of interactive elements (sidebars, dropdowns) to guide user focus.

---

## 👥 Target Users

### 💼 Employers
*   **Needs:** Reliable talent discovery, secure payment management, and project oversight tools.
*   **Key Tools:** Worker Discovery, AI Matching, Job Templates, Employer Wallet, Skill Moderation.

### 🛠️ Gig Workers
*   **Needs:** Relevant job opportunities, guaranteed payment via escrow, and professional profile presentation.
*   **Key Tools:** Instant Job Feed, AI Recommendations, Gig Worker Wallet, Portfolio Management.

### 🛡️ Administrators
*   **Needs:** Platform moderation, fraud prevention, financial auditing, and system configuration.
*   **Key Tools:** Admin Dashboard, Fraud Command Center, KYC Management, Real-time Analytics.

---

## 🛠️ Technology Stack
- **Backend:** Laravel (PHP 8.2+)
- **Frontend:** React with Inertia.js & Vite
- **Styling:** Tailwind CSS (Premium Glassmorphic UI)
- **Database:** Supabase (PostgreSQL)
- **Payments:** Stripe (Escrow, Connect)
- **Media:** Cloudinary / Cloudflare R2
- **AI:** Custom Recommendation Engine
- **Reporting:** Dompdf (Invoices, Contracts)
- **Animations:** GSAP & Three.js
