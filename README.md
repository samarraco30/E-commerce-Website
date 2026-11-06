<<<<<<< HEAD
# E-commerce-Website
A web-based e-commerce platform designed to promote and sell local products of Sta. Maria, Bulacan. The platform connects local sellers and buyers through online shopping, product management, order tracking, payment processing, and inventory management.

## Seller onboarding

Sign in as a buyer and choose **Become a Seller** to submit shop details, a product category, pickup and payout information, and business documents. New applications remain pending until an administrator reviews them. Documents are stored on Laravel's private local disk; payout details are encrypted with the application's `APP_KEY`.

## Authentication and database setup

Registration creates buyer accounts in the backend database, and login issues a persistent API token. The **Remember me** option keeps the token across browser restarts; without it, the token is kept only for the current browser session.

Configure `backend/.env` to connect to PostgreSQL (`DB_CONNECTION=pgsql`, plus the correct `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, and `DB_PASSWORD`). Set `ADMIN_PASSWORD` there to the desired administrator password. The administrator email is reserved as `admin_of_ecommerce@gmail.com`; no other account can register with it.

From `backend`, run `php artisan migrate --seed` to create the tables and the single administrator account. The seeder clears administrator access from any other accounts. All public registrations are buyers, and only the configured administrator can access `/admin`; API authorization is enforced server-side as well.

Password reset uses expiring one-time links. Set `FRONTEND_URL` to the frontend's public URL and configure a real mail transport (`MAIL_MAILER=smtp` and the corresponding `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, and `MAIL_FROM_ADDRESS`) to deliver reset emails. The example environment uses the `log` mailer for local development.

## Seller dashboard and current integrations

Sign in as a buyer and choose **Become a Seller** to submit shop details, pickup and payout information, and business documents. New applications remain pending until an administrator reviews them. Documents are stored on Laravel's private local disk; payout details are encrypted with the application's `APP_KEY`.

The administrator signs in and opens `/admin` to review seller applications, verify buyers, manage or suspend accounts, moderate product listings, monitor transactions and flagged activity, export transaction reports, review return requests, and configure platform settings. `/admin/seller-applications` remains an alias to seller review. Approved sellers can open `/seller` to manage product listings, custom categories, variations, stock, uploaded product images, discount codes, reviews/replies, shop policies and contact details, order fulfillment, and sales reports. Discount codes have a customer-facing promotion name and support percentage savings, fixed-amount savings, and fixed savings with a minimum eligible spend. Seller analytics refresh automatically; orders refresh every few seconds.

Buyer carts are saved in browser storage under account-specific keys. Buyers can claim active seller vouchers from the marketplace; checkout automatically applies the best eligible claimed voucher, while a manually entered voucher code can be used without claiming or to choose a different offer. Orders are stored in PostgreSQL and scoped to their buyer and seller; checkout validates product prices, stock, variations, and discounts, reserves inventory, and creates a separate shipment for each shop. Buyers can reorder from order history using current product prices and stock; unavailable or changed products are reported. Sellers can process orders through preparing, ready-to-ship, shipped, out-for-delivery, and delivered; buyer/seller cancellation before shipping releases reserved stock. Buyers can track orders, leave a review after delivery, and sellers can respond. Customer delivery details and payout account details are encrypted at rest.

Run `php artisan migrate` from `backend` after pulling changes to create seller reports, promotions (including promotion names, discount types, minimum-spend thresholds, and per-buyer claimed vouchers), product variation/image fields, review tables, account and product moderation controls, platform settings, and return-request records. Product image files are stored on Laravel's local disk and served through the public marketplace image endpoint.

The app currently supports cash on delivery, shop-set flat delivery fees, and seller-entered carrier tracking numbers only. Buyers can submit return requests for eligible delivered orders and administrators can review and decide them; refund processing and return shipping are not automated. Payment collection, commissions, actual payout transfers, shipping-label generation, carrier integrations, live buyer-seller messaging, bundles, and free-shipping promotions require external providers or additional workflows and are not represented as completed transactions. Wallet figures are estimates; available balance and completed payouts remain zero until a payment provider is integrated.
=======
E-Commerce Platform for Local Products of Sta. Maria, Bulacan

A web-based e-commerce platform designed to promote, showcase, and sell locally produced products in Sta. Maria, Bulacan. The system connects local sellers and buyers through a centralized online marketplace where users can discover products, place orders, process payments, and manage transactions.

About the Project

The Development of an E-Commerce Platform for Promoting and Selling Local Products of Sta. Maria, Bulacan aims to provide a centralized digital marketplace for local businesses, entrepreneurs, farmers, and individuals who produce or sell goods within Sta. Maria, Bulacan.

Many local sellers still depend on physical stores and social media platforms to promote their products. This can make it difficult to reach potential customers, organize product listings, monitor inventory, and manage orders efficiently.

This project addresses these challenges by developing a web-based marketplace where registered local sellers can showcase their products and buyers can conveniently browse, search, compare, and purchase locally available goods.

Inspired by common e-commerce platforms such as Shopee, the system focuses specifically on promoting local products and connecting buyers with verified sellers within Sta. Maria, Bulacan.

Project Objectives

The project aims to:

Develop a centralized online marketplace for local products in Sta. Maria, Bulacan.
Provide local sellers with an accessible platform to promote and sell their products.
Allow buyers to conveniently browse, search, and purchase local goods.
Provide sellers with tools for product, inventory, order, and sales management.
Implement secure user registration and seller verification.
Provide convenient order tracking and supported payment options.
Improve product discovery through search and recommendation features.
Support local businesses by increasing the online visibility of their products.
Target Users

The platform is designed for three primary types of users:

1. Buyer

Buyers are registered users who can explore and purchase products from local sellers.

Main functionalities:

Register and manage personal accounts.
Browse and search local products.
Filter and sort products by category, price, ratings, and availability.
View product details and seller information.
Add products to the shopping cart.
Place orders and proceed to checkout.
Apply available vouchers and discounts.
Select supported payment methods.
Track order status.
Submit return and refund requests when eligible.
Provide product reviews and ratings.
View purchase history and favorite products.
2. Seller

Sellers are registered local businesses or individuals who offer products through the platform.

Main functionalities:

Register and submit seller verification information.
Manage seller profiles.
Add, edit, and remove products.
Upload product images and descriptions.
Set product prices and quantities.
Manage product categories and variants.
Monitor inventory and stock availability.
View and process customer orders.
Update order and delivery statuses.
Monitor sales and earnings.
Create and manage seller vouchers.
View sales analytics and generate reports.
Review and respond to return and refund requests.
3. Administrator

The administrator manages and monitors the overall platform to ensure proper system operation.

Main functionalities:

Manage buyer and seller accounts.
Review and approve seller verification requests.
Monitor product listings.
Manage product categories.
Monitor orders and transactions.
Review return and refund requests.
Manage reported products or accounts.
Monitor platform activities.
Generate system reports and analytics.
Maintain platform settings and configurations.
Scope and Features
1. Account and Authentication
Buyer registration and login.
Seller registration and login.
Administrator authentication.
Account verification.
User profile management.
Password management.
2. Seller Management
Seller profile management.
Seller verification.
Product and inventory management.
Order processing.
Sales and earnings monitoring.
Voucher management.
Seller analytics.
3. Product Management

Each product may contain:

Product name.
Description.
Price.
Available quantity.
Product images.
Category.
Seller information.
Product variants.
Product availability status.
Customer reviews and ratings.

Example Product Categories:

Agricultural Products
Food and Beverages
Handicrafts
Clothing and Accessories
Household Products
Other Local Products
4. Product Browsing and Search
Search products by name and keywords.
Browse products by category.
Filter products based on price and availability.
Sort products based on price, popularity, and ratings.
View product details and seller information.
5. Product Recommendation System

A rule-based or weighted recommendation algorithm will be implemented to suggest relevant products to buyers.

Recommendations may be based on:

Search history.
Previously viewed products.
Purchase history.
Product categories.
Product ratings.
Popular products.
Similar products.
6. Shopping Cart and Checkout
Add products to cart.
Update product quantities.
Remove products from cart.
Review order summaries.
Enter delivery information.
Apply eligible vouchers.
Calculate subtotal, delivery fees, and final total.
Select a payment method.
Confirm orders.
7. Payment Management

The platform will support the following planned payment methods, subject to implementation and payment integration availability:

Cash on Delivery (COD)
GCash
Bank Transfer
Credit/Debit Cards

The system will record payment details and transaction statuses.

8. Order and Delivery Management
Order placement.
Order confirmation.
Order processing.
Order status updates.
Delivery status monitoring.
Delivery fee recording.
Order history.

The initial delivery approach may use seller-arranged delivery, where sellers handle the delivery of purchased products while the platform records delivery information and status updates.

9. Return and Refund Management
Submit return requests.
Provide return reasons and descriptions.
Upload supporting evidence when required.
Review and approve or reject requests.
Monitor return and refund statuses.

Possible Return and Refund Statuses:

Return Requested
Under Review
Approved
Rejected
Returned
Refund Processed
10. Reviews and Ratings
Submit product ratings.
Write product reviews.
View customer feedback.
Use ratings as a factor in product recommendations and product ranking.
11. Seller Vouchers and Promotions
Create seller-specific vouchers.
Set discount amounts.
Set minimum purchase requirements.
Configure expiration dates.
Set voucher usage limits.
Validate voucher eligibility during checkout.
12. Inventory Management
Monitor available stock.
Track sold quantities.
Identify low-stock products.
Identify out-of-stock products.
Update product quantities.
13. Analytics and Reporting

Buyer Analytics

Purchase history.
Total orders.
Spending history.
Frequently purchased categories.
Favorite products.

Seller Analytics and Reports

Daily sales reports.
Weekly sales reports.
Monthly sales reports.
Product sales reports.
Inventory reports.
Order reports.
Earnings summaries.

Administrator Reports

Total registered users.
Registered sellers.
Total products.
Total orders.
Transaction summaries.
Overall platform activity.
Technology Stack

The project uses the following technologies:

Technology	Purpose
Laravel	Backend development
PHP	Server-side programming
React.js	Frontend development
JavaScript	Frontend functionality
Blade	Laravel templating
CSS	Website styling
HTML	Website structure
MySQL	Database management

Note: Update this section if your actual implementation uses additional or different technologies.

System Architecture

The project follows a frontend and backend architecture:

Frontend: Handles the user interface and user interactions.
Backend: Handles application logic, authentication, product management, orders, and transactions.
Database: Stores user accounts, products, orders, payments, inventory, reviews, and other system records.
System Diagrams

The following diagrams will be included to document the system's design and functionality:

System Flowchart
Data Flow Diagram (DFD)
Use Case Diagram
Entity Relationship Diagram (ERD)
User Interface Wireframes

Diagrams will be added as the system design and documentation are finalized.

Project Structure

The repository is organized into separate frontend and backend directories.

text
E-commerce-Website/
│
├── backend/
│   └── Laravel Application
│
├── frontend/
│   └── React Application
│
├── .gitignore
│
└── README.md

Installation and Setup
Prerequisites

Before running the project, make sure you have installed:

PHP
Composer
Node.js and npm
MySQL
Git
1. Clone the Repository
bash
git clone https://github.com/samarraco30/E-commerce-Website.git


Navigate to the project directory:

bash
cd E-commerce-Website

2. Backend Setup

Navigate to the backend directory:

bash
cd backend


Install PHP dependencies:

bash
composer install


Create your environment file:

bash
cp .env.example .env


Generate the application key:

bash
php artisan key:generate


Configure your database credentials in the .env file.

Run database migrations:

bash
php artisan migrate


Start the Laravel development server:

bash
php artisan serve

3. Frontend Setup

Open another terminal and navigate to the frontend directory:

bash
cd frontend


Install JavaScript dependencies:

bash
npm install


Start the frontend development server using the appropriate script configured in package.json:

bash
npm run dev


Note: Adjust the installation and startup instructions according to your actual Laravel and React project configuration.

Development Status

Project Status: Under Development

The system is currently being developed. Features, interfaces, and functionalities will be implemented progressively.

Planned development modules include:

User authentication and registration
Buyer dashboard
Seller dashboard
Administrator dashboard
Seller verification
Product management
Product browsing and search
Product recommendation system
Shopping cart
Checkout system
Payment management
Order management
Delivery tracking
Inventory management
Voucher management
Reviews and ratings
Return and refund management
Analytics and reporting
Project Information

Project Title: Development of an E-Commerce Platform for Promoting and Selling Local Products of Sta. Maria, Bulacan

Project Type: Web-Based E-Commerce System

Target Location: Sta. Maria, Bulacan, Philippines

Repository: E-Commerce-Website

Contributors

Project development and documentation are managed by the project team.

License

This project is developed for academic and educational purposes. Licensing and distribution terms may be updated when finalized.
>>>>>>> 390a0e5d344f1654104b14abd4c0a7714451f53f
