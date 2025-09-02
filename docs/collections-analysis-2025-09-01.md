# 📊 Appwrite Database Collections Analysis

**Database ID:** `6899993d001b0b35b6b5`
**Total Collections:** 20
**Generated:** 2025-09-01T16:56:46.865Z

## 📋 Collections Overview

| Collection Name | ID | Attributes | Status |
|----------------|----|------------|--------|
| profiles | `profiles` | 7 | ✅ Ready |
| orders | `orders` | 25 | ✅ Ready |
| wallets | `wallets` | 3 | ✅ Ready |
| transactions | `transactions` | 7 | ✅ Ready |
| designs | `designs` | 2 | ✅ Ready |
| email_logs | `email_logs` | 2 | ✅ Ready |
| site_config | `site_config` | 1 | ✅ Ready |
| email_verifications | `email_verifications` | 1 | ✅ Ready |
| receipts | `689ef51d7e33bc965362` | 4 | ✅ Ready |
| invoices | `invoices` | 5 | ✅ Ready |
| receipts | `receipts` | 6 | ✅ Ready |
| wallet_adjustments | `wallet_adjustments` | 2 | ✅ Ready |
| wizard_orders | `wizard_orders` | 6 | ✅ Ready |
| domain_extensions | `domain_extensions` | 0 | ✅ Ready |
| project_files | `project_files` | 6 | ✅ Ready |
| Password Resets | `password_resets` | 4 | ✅ Ready |
| Support Tickets | `support_tickets` | 6 | ✅ Ready |
| Notifications | `notifications` | 4 | ✅ Ready |
| Notification Preferences | `notification_preferences` | 7 | ✅ Ready |
| user_roles | `68b597bc00026c2fc802` | 4 | ✅ Ready |

---

## 🔧 Detailed Collection Analysis

### 1. profiles

**ID:** `profiles`
**Created:** 2025-08-11T12:19:04.387+00:00
**Updated:** 2025-08-11T12:19:04.387+00:00
**Total Attributes:** 7

**Status:** ✅ 7 available, ⏳ 0 processing, ❌ 0 failed

#### Attributes Detail

| Field Name | Type | Required | Status | Size/Options |
|------------|------|----------|--------|--------------|
| full_name | string | Yes | ✅ | max 255 chars |
| created_at | datetime | Yes | ✅ | ISO format |
| updated_at | datetime | Yes | ✅ | ISO format |
| user_id | string | Yes | ✅ | max 36 chars |
| email | string | No | ✅ | max 255 chars |
| phone | string | No | ✅ | max 255 chars |
| address | string | No | ✅ | max 255 chars |
#### Field Pattern Analysis

- **User ID field:** ✅
- **Created timestamp:** ✅
- **Updated timestamp:** ✅
- **Status field:** ❌

#### Naming Convention Analysis

- **Snake_case fields:** 4 (full_name, created_at, updated_at, user_id)

---

### 2. orders

**ID:** `orders`
**Created:** 2025-08-11T12:20:08.602+00:00
**Updated:** 2025-08-11T12:20:08.602+00:00
**Total Attributes:** 25

**Status:** ✅ 25 available, ⏳ 0 processing, ❌ 0 failed

#### Attributes Detail

| Field Name | Type | Required | Status | Size/Options |
|------------|------|----------|--------|--------------|
| design_data | string | No | ✅ | max 8192 chars |
| design_preview_url | string | No | ✅ | max 500 chars |
| total_pages | integer | No | ✅ | -9223372036854776000 to 9223372036854776000 |
| total_sections | integer | No | ✅ | -9223372036854776000 to 9223372036854776000 |
| design_options | string | No | ✅ | max 2048 chars |
| payment_status | string | No | ✅ | max 20 chars |
| payment_gateway | string | No | ✅ | max 50 chars |
| zarinpal_authority | string | No | ✅ | max 100 chars |
| zarinpal_ref_id | string | No | ✅ | max 100 chars |
| user_id | string | Yes | ✅ | max 36 chars |
| callback_url | string | No | ✅ | max 255 chars |
| return_url | string | No | ✅ | max 255 chars |
| created_at | datetime | Yes | ✅ | ISO format |
| updated_at | datetime | Yes | ✅ | ISO format |
| session_id | string | No | ✅ | max 100 chars |
| site_type | string | No | ✅ | max 50 chars |
| wizard_data | string | No | ✅ | max 16384 chars |
| website_framework | string | No | ✅ | max 255 chars |
| additional_services | string | No | ✅ | max 65535 chars |
| total_amount | double | Yes | ✅ |  |
| title | string | Yes | ✅ | max 255 chars |
| status | string | Yes | ✅ | max 255 chars |
| description | string | No | ✅ | max 255 chars |
| price | string | No | ✅ | max 255 chars |
| comments | string | No | ✅ | max 255 chars |
#### Field Pattern Analysis

- **User ID field:** ✅
- **Created timestamp:** ✅
- **Updated timestamp:** ✅
- **Status field:** ✅

#### Naming Convention Analysis

- **Snake_case fields:** 20 (design_data, design_preview_url, total_pages, total_sections, design_options...)

---

### 3. wallets

**ID:** `wallets`
**Created:** 2025-08-11T12:20:54.560+00:00
**Updated:** 2025-08-11T12:20:54.560+00:00
**Total Attributes:** 3

**Status:** ✅ 3 available, ⏳ 0 processing, ❌ 0 failed

#### Attributes Detail

| Field Name | Type | Required | Status | Size/Options |
|------------|------|----------|--------|--------------|
| created_at | datetime | Yes | ✅ | ISO format |
| updated_at | datetime | Yes | ✅ | ISO format |
| user_id | string | Yes | ✅ | max 36 chars |
#### Field Pattern Analysis

- **User ID field:** ✅
- **Created timestamp:** ✅
- **Updated timestamp:** ✅
- **Status field:** ❌

#### Naming Convention Analysis

- **Snake_case fields:** 3 (created_at, updated_at, user_id)

---

### 4. transactions

**ID:** `transactions`
**Created:** 2025-08-11T12:21:20.023+00:00
**Updated:** 2025-08-11T12:21:20.023+00:00
**Total Attributes:** 7

**Status:** ✅ 7 available, ⏳ 0 processing, ❌ 0 failed

#### Attributes Detail

| Field Name | Type | Required | Status | Size/Options |
|------------|------|----------|--------|--------------|
| wallet_id | string | Yes | ✅ | max 36 chars |
| user_id | string | Yes | ✅ | max 36 chars |
| balance_before | double | Yes | ✅ |  |
| balance_after | double | Yes | ✅ |  |
| reference_id | string | No | ✅ | max 36 chars |
| reference_type | string | No | ✅ | max 50 chars |
| created_at | datetime | Yes | ✅ | ISO format |
#### Field Pattern Analysis

- **User ID field:** ✅
- **Created timestamp:** ✅
- **Updated timestamp:** ❌
- **Status field:** ❌

#### Naming Convention Analysis

- **Snake_case fields:** 7 (wallet_id, user_id, balance_before, balance_after, reference_id...)

---

### 5. designs

**ID:** `designs`
**Created:** 2025-08-11T12:22:43.566+00:00
**Updated:** 2025-08-11T12:22:43.566+00:00
**Total Attributes:** 2

**Status:** ✅ 2 available, ⏳ 0 processing, ❌ 0 failed

#### Attributes Detail

| Field Name | Type | Required | Status | Size/Options |
|------------|------|----------|--------|--------------|
| order_id | string | Yes | ✅ | max 36 chars |
| user_id | string | Yes | ✅ | max 36 chars |
#### Field Pattern Analysis

- **User ID field:** ✅
- **Created timestamp:** ❌
- **Updated timestamp:** ❌
- **Status field:** ❌

#### Naming Convention Analysis

- **Snake_case fields:** 2 (order_id, user_id)

---

### 6. email_logs

**ID:** `email_logs`
**Created:** 2025-08-11T12:23:58.348+00:00
**Updated:** 2025-08-11T12:23:58.348+00:00
**Total Attributes:** 2

**Status:** ✅ 2 available, ⏳ 0 processing, ❌ 0 failed

#### Attributes Detail

| Field Name | Type | Required | Status | Size/Options |
|------------|------|----------|--------|--------------|
| sent_at | datetime | Yes | ✅ | ISO format |
| user_id | string | No | ✅ | max 36 chars |
#### Field Pattern Analysis

- **User ID field:** ✅
- **Created timestamp:** ❌
- **Updated timestamp:** ❌
- **Status field:** ❌

#### Naming Convention Analysis

- **Snake_case fields:** 2 (sent_at, user_id)

---

### 7. site_config

**ID:** `site_config`
**Created:** 2025-08-11T12:25:21.971+00:00
**Updated:** 2025-08-11T12:25:21.971+00:00
**Total Attributes:** 1

**Status:** ✅ 1 available, ⏳ 0 processing, ❌ 0 failed

#### Attributes Detail

| Field Name | Type | Required | Status | Size/Options |
|------------|------|----------|--------|--------------|
| updated_at | datetime | Yes | ✅ | ISO format |
#### Field Pattern Analysis

- **User ID field:** ❌
- **Created timestamp:** ❌
- **Updated timestamp:** ✅
- **Status field:** ❌

#### Naming Convention Analysis

- **Snake_case fields:** 1 (updated_at)

---

### 8. email_verifications

**ID:** `email_verifications`
**Created:** 2025-08-13T18:54:35.656+00:00
**Updated:** 2025-08-13T18:54:35.656+00:00
**Total Attributes:** 1

**Status:** ✅ 1 available, ⏳ 0 processing, ❌ 0 failed

#### Attributes Detail

| Field Name | Type | Required | Status | Size/Options |
|------------|------|----------|--------|--------------|
| user_id | string | Yes | ✅ | max 36 chars |
#### Field Pattern Analysis

- **User ID field:** ✅
- **Created timestamp:** ❌
- **Updated timestamp:** ❌
- **Status field:** ❌

#### Naming Convention Analysis

- **Snake_case fields:** 1 (user_id)

---

### 9. receipts

**ID:** `689ef51d7e33bc965362`
**Created:** 2025-08-15T08:51:41.517+00:00
**Updated:** 2025-08-15T08:51:41.517+00:00
**Total Attributes:** 4

**Status:** ✅ 4 available, ⏳ 0 processing, ❌ 0 failed

#### Attributes Detail

| Field Name | Type | Required | Status | Size/Options |
|------------|------|----------|--------|--------------|
| invoice_id | string | Yes | ✅ | max 36 chars |
| ref_id | string | Yes | ✅ | max 100 chars |
| created_at | datetime | Yes | ✅ | ISO format |
| updated_at | datetime | Yes | ✅ | ISO format |
#### Field Pattern Analysis

- **User ID field:** ❌
- **Created timestamp:** ✅
- **Updated timestamp:** ✅
- **Status field:** ❌

#### Naming Convention Analysis

- **Snake_case fields:** 4 (invoice_id, ref_id, created_at, updated_at)

---

### 10. invoices

**ID:** `invoices`
**Created:** 2025-08-16T19:34:45.301+00:00
**Updated:** 2025-08-16T19:34:45.301+00:00
**Total Attributes:** 5

**Status:** ✅ 5 available, ⏳ 0 processing, ❌ 0 failed

#### Attributes Detail

| Field Name | Type | Required | Status | Size/Options |
|------------|------|----------|--------|--------------|
| user_id | string | Yes | ✅ | max 36 chars |
| order_id | string | Yes | ✅ | max 36 chars |
| due_date | datetime | Yes | ✅ | ISO format |
| created_at | datetime | Yes | ✅ | ISO format |
| updated_at | datetime | Yes | ✅ | ISO format |
#### Field Pattern Analysis

- **User ID field:** ✅
- **Created timestamp:** ✅
- **Updated timestamp:** ✅
- **Status field:** ❌

#### Naming Convention Analysis

- **Snake_case fields:** 5 (user_id, order_id, due_date, created_at, updated_at)

---

### 11. receipts

**ID:** `receipts`
**Created:** 2025-08-16T19:34:55.485+00:00
**Updated:** 2025-08-16T19:34:55.485+00:00
**Total Attributes:** 6

**Status:** ✅ 6 available, ⏳ 0 processing, ❌ 0 failed

#### Attributes Detail

| Field Name | Type | Required | Status | Size/Options |
|------------|------|----------|--------|--------------|
| invoice_id | string | Yes | ✅ | max 36 chars |
| ref_id | string | Yes | ✅ | max 100 chars |
| format | string | Yes | ✅ | max 10 chars |
| created_at | datetime | Yes | ✅ | ISO format |
| updated_at | datetime | Yes | ✅ | ISO format |
| amount | double | Yes | ✅ |  |
#### Field Pattern Analysis

- **User ID field:** ❌
- **Created timestamp:** ✅
- **Updated timestamp:** ✅
- **Status field:** ❌

#### Naming Convention Analysis

- **Snake_case fields:** 4 (invoice_id, ref_id, created_at, updated_at)

---

### 12. wallet_adjustments

**ID:** `wallet_adjustments`
**Created:** 2025-08-16T19:35:00.961+00:00
**Updated:** 2025-08-16T19:35:00.961+00:00
**Total Attributes:** 2

**Status:** ✅ 2 available, ⏳ 0 processing, ❌ 0 failed

#### Attributes Detail

| Field Name | Type | Required | Status | Size/Options |
|------------|------|----------|--------|--------------|
| admin_id | string | Yes | ✅ | max 36 chars |
| created_at | datetime | Yes | ✅ | ISO format |
#### Field Pattern Analysis

- **User ID field:** ❌
- **Created timestamp:** ✅
- **Updated timestamp:** ❌
- **Status field:** ❌

#### Naming Convention Analysis

- **Snake_case fields:** 2 (admin_id, created_at)

---

### 13. wizard_orders

**ID:** `wizard_orders`
**Created:** 2025-08-16T19:35:08.866+00:00
**Updated:** 2025-08-16T19:35:08.866+00:00
**Total Attributes:** 8

**Status:** ✅ 6 available, ⏳ 0 processing, ❌ 0 failed

#### Attributes Detail

| Field Name | Type | Required | Status | Size/Options |
|------------|------|----------|--------|--------------|
| userId | string | No | ❌ | max 36 chars |
| sessionId | string | Yes | ❌ | max 100 chars |
| user_id | string | No | ✅ | max 36 chars |
| session_id | string | Yes | ✅ | max 100 chars |
| created_at | string | Yes | ✅ | max 255 chars |
| updated_at | string | Yes | ✅ | max 255 chars |
| wizard_data | string | No | ✅ | max 255 chars |
| status | string | No | ✅ | max 255 chars |
#### Field Pattern Analysis

- **User ID field:** ✅
- **Created timestamp:** ✅
- **Updated timestamp:** ✅
- **Status field:** ✅

#### Naming Convention Analysis

- **Snake_case fields:** 5 (user_id, session_id, created_at, updated_at, wizard_data)
- **camelCase fields:** 2 (userId, sessionId)

---

### 14. domain_extensions

**ID:** `domain_extensions`
**Created:** 2025-08-16T19:35:20.368+00:00
**Updated:** 2025-08-16T19:35:20.368+00:00
**Total Attributes:** 0

**Status:** ✅ 0 available, ⏳ 0 processing, ❌ 0 failed

#### Field Pattern Analysis

- **User ID field:** ❌
- **Created timestamp:** ❌
- **Updated timestamp:** ❌
- **Status field:** ❌

---

### 15. project_files

**ID:** `project_files`
**Created:** 2025-08-16T19:35:32.488+00:00
**Updated:** 2025-08-16T19:35:32.488+00:00
**Total Attributes:** 6

**Status:** ✅ 6 available, ⏳ 0 processing, ❌ 0 failed

#### Attributes Detail

| Field Name | Type | Required | Status | Size/Options |
|------------|------|----------|--------|--------------|
| uploadedAt | datetime | Yes | ✅ | ISO format |
| order_id | string | Yes | ✅ | max 36 chars |
| original_name | string | Yes | ✅ | max 255 chars |
| mime_type | string | Yes | ✅ | max 100 chars |
| bucket_id | string | Yes | ✅ | max 36 chars |
| file_id | string | Yes | ✅ | max 36 chars |
#### Field Pattern Analysis

- **User ID field:** ❌
- **Created timestamp:** ❌
- **Updated timestamp:** ❌
- **Status field:** ❌

#### Naming Convention Analysis

- **Snake_case fields:** 5 (order_id, original_name, mime_type, bucket_id, file_id)
- **camelCase fields:** 1 (uploadedAt)

---

### 16. Password Resets

**ID:** `password_resets`
**Created:** 2025-08-23T13:05:06.577+00:00
**Updated:** 2025-08-23T13:05:06.577+00:00
**Total Attributes:** 4

**Status:** ✅ 4 available, ⏳ 0 processing, ❌ 0 failed

#### Attributes Detail

| Field Name | Type | Required | Status | Size/Options |
|------------|------|----------|--------|--------------|
| user_id | string | Yes | ✅ | max 36 chars |
| created_at | datetime | Yes | ✅ | ISO format |
| expires_at | string | Yes | ✅ | max 255 chars |
| used | string | No | ✅ | max 255 chars |
#### Field Pattern Analysis

- **User ID field:** ✅
- **Created timestamp:** ✅
- **Updated timestamp:** ❌
- **Status field:** ❌

#### Naming Convention Analysis

- **Snake_case fields:** 3 (user_id, created_at, expires_at)

---

### 17. Support Tickets

**ID:** `support_tickets`
**Created:** 2025-08-25T07:35:28.824+00:00
**Updated:** 2025-08-25T07:35:28.824+00:00
**Total Attributes:** 6

**Status:** ✅ 6 available, ⏳ 0 processing, ❌ 0 failed

#### Attributes Detail

| Field Name | Type | Required | Status | Size/Options |
|------------|------|----------|--------|--------------|
| user_id | string | Yes | ✅ | max 36 chars |
| created_at | datetime | Yes | ✅ | ISO format |
| updated_at | datetime | Yes | ✅ | ISO format |
| title | string | Yes | ✅ | max 255 chars |
| assigned_to | string | No | ✅ | max 255 chars |
| admin_user_id | string | No | ✅ | max 255 chars |
#### Field Pattern Analysis

- **User ID field:** ✅
- **Created timestamp:** ✅
- **Updated timestamp:** ✅
- **Status field:** ❌

#### Naming Convention Analysis

- **Snake_case fields:** 5 (user_id, created_at, updated_at, assigned_to, admin_user_id)

---

### 18. Notifications

**ID:** `notifications`
**Created:** 2025-08-25T07:36:07.207+00:00
**Updated:** 2025-08-25T07:36:07.207+00:00
**Total Attributes:** 4

**Status:** ✅ 4 available, ⏳ 0 processing, ❌ 0 failed

#### Attributes Detail

| Field Name | Type | Required | Status | Size/Options |
|------------|------|----------|--------|--------------|
| user_id | string | Yes | ✅ | max 36 chars |
| created_at | datetime | Yes | ✅ | ISO format |
| read | string | No | ✅ | max 255 chars |
| updated_at | string | No | ✅ | max 255 chars |
#### Field Pattern Analysis

- **User ID field:** ✅
- **Created timestamp:** ✅
- **Updated timestamp:** ✅
- **Status field:** ❌

#### Naming Convention Analysis

- **Snake_case fields:** 3 (user_id, created_at, updated_at)

---

### 19. Notification Preferences

**ID:** `notification_preferences`
**Created:** 2025-08-25T07:36:37.089+00:00
**Updated:** 2025-08-25T07:36:37.089+00:00
**Total Attributes:** 7

**Status:** ✅ 7 available, ⏳ 0 processing, ❌ 0 failed

#### Attributes Detail

| Field Name | Type | Required | Status | Size/Options |
|------------|------|----------|--------|--------------|
| user_id | string | Yes | ✅ | max 36 chars |
| email_preferences | string | Yes | ✅ | max 1000 chars |
| sms_preferences | string | Yes | ✅ | max 1000 chars |
| push_preferences | string | Yes | ✅ | max 1000 chars |
| dashboard_preferences | string | Yes | ✅ | max 1000 chars |
| created_at | datetime | Yes | ✅ | ISO format |
| updated_at | datetime | Yes | ✅ | ISO format |
#### Field Pattern Analysis

- **User ID field:** ✅
- **Created timestamp:** ✅
- **Updated timestamp:** ✅
- **Status field:** ❌

#### Naming Convention Analysis

- **Snake_case fields:** 7 (user_id, email_preferences, sms_preferences, push_preferences, dashboard_preferences...)

---

### 20. user_roles

**ID:** `68b597bc00026c2fc802`
**Created:** 2025-09-01T12:55:27.575+00:00
**Updated:** 2025-09-01T12:55:27.575+00:00
**Total Attributes:** 4

**Status:** ✅ 4 available, ⏳ 0 processing, ❌ 0 failed

#### Attributes Detail

| Field Name | Type | Required | Status | Size/Options |
|------------|------|----------|--------|--------------|
| user_id | string | Yes | ✅ | max 36 chars |
| role | string | No | ✅ |  |
| created_at | datetime | Yes | ✅ | ISO format |
| updated_at | datetime | No | ✅ | ISO format |
#### Field Pattern Analysis

- **User ID field:** ✅
- **Created timestamp:** ✅
- **Updated timestamp:** ✅
- **Status field:** ❌

#### Naming Convention Analysis

- **Snake_case fields:** 3 (user_id, created_at, updated_at)

---

## 💡 Recommendations & Insights

### 📊 Statistics

- **Total Collections:** 20
- **Total Attributes:** 104
- **Average Attributes per Collection:** 5

### 🔧 Potential Improvements

- **transactions:** Consider adding updated_at
- **designs:** Consider adding created_at, updated_at
- **email_logs:** Consider adding created_at, updated_at
- **site_config:** Consider adding user_id, created_at
- **email_verifications:** Consider adding created_at, updated_at
- **receipts:** Consider adding user_id
- **receipts:** Consider adding user_id
- **wallet_adjustments:** Consider adding user_id, updated_at
- **wizard_orders:** Mixed naming conventions detected - consider standardizing
- **domain_extensions:** Consider adding user_id, created_at, updated_at
- **project_files:** Consider adding user_id, created_at, updated_at
- **project_files:** Mixed naming conventions detected - consider standardizing
- **Password Resets:** Consider adding updated_at

---

## 📋 Export Information

This document was generated automatically and can be used for:
- Database schema review and documentation
- Schema optimization planning
- Application requirements comparison
- Team collaboration and knowledge sharing

**Generated by:** Appwrite Collections Analyzer
**Generated at:** 2025-09-01T17:00:14.707Z
