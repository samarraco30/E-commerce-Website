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
