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
