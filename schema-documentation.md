# Schema Documentation

----------------------------------------------------------------------------------------------------

## Table: users
- id uuid (not null)
- first_name text (not null)
- last_name text (not null)
- middle_initial text (nullable)
- email text (not null)
- address text (not null)
- contact_number text (not null)
- national_id_key text (nullable)
- selfie_id_key text (nullable)
- role text (nullable, default: 'user')
- created_at timestamp without time zone (nullable, default: now())
- verification_status text (not null, default: 'unverified')

# Constraints
- Primary Key: users_pkey on id
- Unique: users_email_key on email
- Check: users_role_check for role in ('user', 'admin')
- Check: users_verification_status_chk for verification_status in ('unverified', 'pending', 'verified', 'rejected')

----------------------------------------------------------------------------------------------------

## Table: rentals
- id uuid (not null, default: gen_random_uuid())
- user_id uuid (nullable)
- camera_id uuid (not null)
- start_date date (not null)
- end_date date (not null)
- total_price numeric (nullable)
- rental_status text (not null, default: 'pending')
- customer_name text (nullable)
- customer_contact text (nullable)
- customer_email text (nullable)
- created_at timestamp with time zone (nullable, default: now())
- booking_type text (nullable, default: 'registered_user')
- contract_pdf_url text (nullable)
- shipping_status text (nullable)
- price_per_day smallint (nullable)

# Constraints
- Primary Key: rentals_pkey on id
- Foreign Key: rentals_camera_id_fkey references cameras(id)
- Foreign Key: rentals_user_id_fkey references users(id)
- Check: rentals_booking_type_check for booking_type in ('registered_user', 'temporary')
- Check: rentals_rental_status_check for rental_status in ('pending', 'confirmed', 'active', 'completed', 'cancelled', 'rejected')
- Check: rentals_shipping_status_check ensures shipping_status is either null or one of the allowed values

# Indexes
- idx_rentals_camera_id on camera_id
- idx_rentals_date_range on daterange(start_date, end_date, '[]')
- idx_rentals_timeline on start_date, end_date
- idx_rentals_camera_status on camera_id, rental_status
- idx_rentals_booking_type on booking_type
- idx_rentals_user_dates_status on user_id, start_date DESC, rental_status
- idx_rentals_camera_timeline_status on camera_id, start_date, end_date, rental_status

# Triggers
- rental_status_update_camera: After insert or update of rental_status, executes update_camera_status_from_rental()

----------------------------------------------------------------------------------------------------

## Table: inclusion_items
- id uuid (not null, default: gen_random_uuid())
- name text (not null)
- created_at timestamp with time zone (not null, default: now())

# Constraints
- Primary Key: inclusion_items_pkey on id

----------------------------------------------------------------------------------------------------

## Table: cameras
- id uuid (not null, default: gen_random_uuid())
- name text (not null)
- description text (nullable)
- image_url text (nullable)
- created_at timestamp without time zone (nullable, default: now())
- serial_number text (nullable)
- cost numeric(10, 2) (nullable)
- camera_condition text (nullable)
- camera_status text (nullable, default: 'available')
- purchase_date date (nullable)

# Constraints
- Primary Key: cameras_pkey on id
- Check: cameras_camera_condition_check for camera_condition in ('excellent', 'good', 'fair', 'poor')
- Check: cameras_camera_status_check for camera_status in ('available', 'booked', 'out', 'under_maintenance', 'retired')

----------------------------------------------------------------------------------------------------

## Table: camera_pricing_tiers
- id uuid (not null, default: gen_random_uuid())
- camera_id uuid (not null)
- min_days integer (not null)
- max_days integer (nullable)
- price_per_day numeric (not null)
- description text (nullable)
- created_at timestamp with time zone (not null, default: now())
- updated_at timestamp with time zone (not null, default: now())

# Constraints
- Primary Key: camera_pricing_tiers_pkey on id
- Foreign Key: camera_pricing_tiers_camera_id_fkey references cameras(id) with cascade on update and delete

----------------------------------------------------------------------------------------------------

## Table: camera_inclusions

- camera_id uuid (not null, default: gen_random_uuid())
- inclusion_item_id uuid (not null, default: gen_random_uuid())
- quantity integer (not null, default: 1)

# Constraints
- Primary Key: camera_inclusions_pkey on camera_id, inclusion_item_id
- Foreign Key: camera_inclusions_camera_id_fkey references cameras(id) with cascade on update and delete
- Foreign Key: camera_inclusions_inclusion_item_id_fkey references inclusion_items(id) with cascade on update and delete