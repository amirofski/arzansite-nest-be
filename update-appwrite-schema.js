// Load environment variables from .env manually (without external deps)
try {
    const fs = require('fs');
    if (fs.existsSync('.env')) {
      const lines = fs.readFileSync('.env', 'utf8').split(/\r?\n/);
      for (const line of lines) {
        if (!line || line.trim().startsWith('#')) continue;
        const idx = line.indexOf('=');
        if (idx > 0) {
          const key = line.slice(0, idx).trim();
          const val = line.slice(idx + 1);
          if (key && !(key in process.env)) {
            process.env[key] = val;
          }
        }
      }
    }
  } catch (e) {
    // ignore env load errors; fall back to existing env
  }
  
  const { Client, Databases, ID } = require('node-appwrite');
  
  // Appwrite configuration
  const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://app.arzansite.com/v1';
  const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '6898b35e003067cd7b43';
  const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || 'standard_89de7518d2a2925036fafc4c4be992fa34e7ba59049d6c3f7aaa3bdaced79dc4325cceaca2a5a479f9020abce3a4d3922fdffbe0f79b2e04a709df436e4f3a73b1915563e873884c3478de964fa3722b31ae2fae7cdc458051c2be4721a2fa12c5fb82af4c6e73a4492b9f88b0c3ab78f7a0c60cf7954fe571c37564aca159f4';
  const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '6899993d001b0b35b6b5';
  
  // Initialize Appwrite client with latest patterns
  const client = new Client()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID)
      .setKey(APPWRITE_API_KEY);
  
  const databases = new Databases(client);
  
  // New collections for Wallet & Invoice Management System (snake_case to match services)
  const newCollections = {
      invoices: {
          name: 'Invoices',
          permissions: ["read(\"any\")", "write(\"any\")"],
          attributes: {
              user_id: { type: 'string', required: true, size: 36 },
              order_id: { type: 'string', required: true, size: 36 },
              amount: { type: 'float', required: true },
              due_date: { type: 'datetime', required: true },
              status: { type: 'string', required: true, size: 20 }, // pending, paid, overdue, cancelled
              description: { type: 'string', required: false, size: 500 },
              created_at: { type: 'datetime', required: true },
              updated_at: { type: 'datetime', required: true }
          },
          indexes: {
              'idx_user_invoices': {
                  type: 'key',
                  attributes: ['user_id'],
                  orders: ['ASC']
              },
              'idx_order_invoices': {
                  type: 'key',
                  attributes: ['order_id'],
                  orders: ['ASC']
              },
              'idx_invoice_status': {
                  type: 'key',
                  attributes: ['status'],
                  orders: ['ASC']
              },
              'idx_due_date': {
                  type: 'key',
                  attributes: ['due_date'],
                  orders: ['ASC']
              },
              'idx_created_at': {
                  type: 'key',
                  attributes: ['created_at'],
                  orders: ['DESC']
              }
          }
      },
      receipts: {
          name: 'Receipts',
          permissions: ["read(\"any\")", "write(\"any\")"],
          attributes: {
              invoice_id: { type: 'string', required: true, size: 36 },
              ref_id: { type: 'string', required: true, size: 100 },
              amount: { type: 'float', required: true },
              format: { type: 'string', required: true, size: 10 }, // pdf, html
              created_at: { type: 'datetime', required: true },
              updated_at: { type: 'datetime', required: true }
          },
          indexes: {
              'idx_invoice_receipts': {
                  type: 'key',
                  attributes: ['invoice_id'],
                  orders: ['ASC']
              },
              'idx_ref_id': {
                  type: 'key',
                  attributes: ['ref_id'],
                  orders: ['ASC']
              },
              'idx_created_at': {
                  type: 'key',
                  attributes: ['created_at'],
                  orders: ['DESC']
              }
          }
      },
      walletAdjustments: {
          name: 'Wallet Adjustments',
          permissions: ["read(\"any\")", "write(\"any\")"],
          attributes: {
              wallet_id: { type: 'string', required: true, size: 36 },
              admin_id: { type: 'string', required: true, size: 36 },
              amount: { type: 'float', required: true },
              type: { type: 'string', required: true, size: 20 }, // credit, debit, correction
              reason: { type: 'string', required: true, size: 500 },
              notes: { type: 'string', required: false, size: 1000 },
              balance_before: { type: 'float', required: true },
              balance_after: { type: 'float', required: true },
              created_at: { type: 'datetime', required: true },
              updated_at: { type: 'datetime', required: true }
          },
          indexes: {
              'idx_wallet_adjustments': {
                  type: 'key',
                  attributes: ['wallet_id'],
                  orders: ['ASC']
              },
              'idx_admin_adjustments': {
                  type: 'key',
                  attributes: ['admin_id'],
                  orders: ['ASC']
              },
              'idx_adjustment_type': {
                  type: 'key',
                  attributes: ['type'],
                  orders: ['ASC']
              },
              'idx_created_at': {
                  type: 'key',
                  attributes: ['created_at'],
                  orders: ['DESC']
              }
          }
      },
          profiles: {
        name: 'Profiles',
        permissions: ["read(\"any\")", "write(\"any\")"],
        attributes: {
            user_id: { type: 'string', required: true, size: 36 },
            email: { type: 'email', required: true },
            full_name: { type: 'string', required: false, size: 255 },
            phone: { type: 'string', required: false, size: 50 },
            address: { type: 'string', required: false, size: 500 },
            created_at: { type: 'datetime', required: true },
            updated_at: { type: 'datetime', required: true }
        },
        indexes: {
            'idx_user_profile': {
                type: 'key',
                attributes: ['user_id'],
                orders: ['ASC']
            }
        }
    },
    // Enhanced Collections for Order Registration & Wallet Management System
    enhanced_orders: {
        name: 'Enhanced Orders',
        permissions: ["read(\"any\")", "write(\"any\")"],
        attributes: {
            user_id: { type: 'string', required: true, size: 36 },
            title: { type: 'string', required: true, size: 255 },
            description: { type: 'string', required: true, size: 1000 },
            price: { type: 'float', required: true },
            site_type: { type: 'string', required: true, size: 20, enum: ['personal', 'business'] },
            status: { type: 'string', required: true, size: 20, enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'] },
            payment_status: { type: 'string', required: true, size: 20, enum: ['pending', 'processing', 'succeeded', 'failed', 'refunded', 'cancelled'] },
            payment_method: { type: 'string', required: false, size: 20, enum: ['wallet', 'zarinpal'] },
            transaction_id: { type: 'string', required: false, size: 100 },
            zarinpal_authority: { type: 'string', required: false, size: 100 },
            zarinpal_ref_id: { type: 'string', required: false, size: 100 },
            wizard_data: { type: 'string', required: true, size: 10000 },
            progress_data: { type: 'string', required: false, size: 5000 },
            session_id: { type: 'string', required: false, size: 100 },
            created_at: { type: 'datetime', required: true },
            updated_at: { type: 'datetime', required: true }
        },
        indexes: {
            'idx_user_id': {
                type: 'key',
                attributes: ['user_id'],
                orders: ['ASC']
            },
            'idx_status': {
                type: 'key',
                attributes: ['status'],
                orders: ['ASC']
            },
            'idx_payment_status': {
                type: 'key',
                attributes: ['payment_status'],
                orders: ['ASC']
            },
            'idx_created_at': {
                type: 'key',
                attributes: ['created_at'],
                orders: ['DESC']
            },
            'idx_user_status_composite': {
                type: 'key',
                attributes: ['user_id', 'status'],
                orders: ['ASC', 'ASC']
            }
        }
    },
    enhanced_wallet_transactions: {
        name: 'Enhanced Wallet Transactions',
        permissions: ["read(\"any\")", "write(\"any\")"],
        attributes: {
            user_id: { type: 'string', required: true, size: 36 },
            type: { type: 'string', required: true, size: 20, enum: ['deposit', 'withdrawal', 'payment', 'refund', 'credit', 'debit'] },
            amount: { type: 'float', required: true },
            description: { type: 'string', required: true, size: 500 },
            status: { type: 'string', required: true, size: 20, enum: ['pending', 'completed', 'failed', 'cancelled'] },
            balance_before: { type: 'float', required: true },
            balance_after: { type: 'float', required: true },
            reference_id: { type: 'string', required: false, size: 100 },
            reference_type: { type: 'string', required: false, size: 50 },
            metadata: { type: 'string', required: false, size: 2000 },
            created_at: { type: 'datetime', required: true }
        },
        indexes: {
            'idx_user_id': {
                type: 'key',
                attributes: ['user_id'],
                orders: ['ASC']
            },
            'idx_type': {
                type: 'key',
                attributes: ['type'],
                orders: ['ASC']
            },
            'idx_status': {
                type: 'key',
                attributes: ['status'],
                orders: ['ASC']
            },
            'idx_reference_id': {
                type: 'key',
                attributes: ['reference_id'],
                orders: ['ASC']
            },
            'idx_created_at': {
                type: 'key',
                attributes: ['created_at'],
                orders: ['DESC']
            },
            'idx_user_type_composite': {
                type: 'key',
                attributes: ['user_id', 'type'],
                orders: ['ASC', 'ASC']
            }
        }
    },
    order_progress: {
        name: 'Order Progress',
        permissions: ["read(\"any\")", "write(\"any\")"],
        attributes: {
            order_id: { type: 'string', required: true, size: 36 },
            user_id: { type: 'string', required: true, size: 36 },
            current_step: { type: 'string', required: true, size: 100 },
            completed_steps: { type: 'string', required: true, size: 1000, array: true },
            remaining_steps: { type: 'string', required: true, size: 1000, array: true },
            progress_percentage: { type: 'integer', required: true, min: 0, max: 100 },
            estimated_delivery: { type: 'datetime', required: true },
            last_update: { type: 'datetime', required: true },
            next_milestone: { type: 'string', required: false, size: 200 },
            timeline: { type: 'string', required: false, size: 5000 },
            notes: { type: 'string', required: false, size: 2000 },
            attachments: { type: 'string', required: false, size: 2000 },
            created_at: { type: 'datetime', required: true },
            updated_at: { type: 'datetime', required: true }
        },
        indexes: {
            'idx_order_id': {
                type: 'key',
                attributes: ['order_id'],
                orders: ['ASC']
            },
            'idx_user_id': {
                type: 'key',
                attributes: ['user_id'],
                orders: ['ASC']
            },
            'idx_current_step': {
                type: 'key',
                attributes: ['current_step'],
                orders: ['ASC']
            },
            'idx_progress_percentage': {
                type: 'key',
                attributes: ['progress_percentage'],
                orders: ['ASC']
            }
        }
    },
    support_tickets: {
        name: 'Support Tickets',
        permissions: ["read(\"any\")", "write(\"any\")"],
        attributes: {
            user_id: { type: 'string', required: true, size: 36 },
            type: { type: 'string', required: true, size: 30, enum: ['payment_failed', 'order_problem', 'wallet_issue', 'technical_problem', 'other'] },
            order_id: { type: 'string', required: false, size: 36 },
            transaction_id: { type: 'string', required: false, size: 100 },
            description: { type: 'string', required: true, size: 2000 },
            priority: { type: 'string', required: true, size: 20, enum: ['low', 'medium', 'high', 'urgent'] },
            status: { type: 'string', required: true, size: 20, enum: ['open', 'in_progress', 'resolved', 'closed'] },
            attachments: { type: 'string', required: false, size: 2000 },
            contact_preference: { type: 'string', required: true, size: 20, enum: ['email', 'phone', 'dashboard'] },
            user_agent: { type: 'string', required: true, size: 500 },
            ip_address: { type: 'string', required: true, size: 45 },
            estimated_resolution: { type: 'string', required: false, size: 100 },
            assigned_to: { type: 'string', required: false, size: 36 },
            messages: { type: 'string', required: false, size: 10000 },
            created_at: { type: 'datetime', required: true },
            updated_at: { type: 'datetime', required: true }
        },
        indexes: {
            'idx_user_id': {
                type: 'key',
                attributes: ['user_id'],
                orders: ['ASC']
            },
            'idx_type': {
                type: 'key',
                attributes: ['type'],
                orders: ['ASC']
            },
            'idx_priority': {
                type: 'key',
                attributes: ['priority'],
                orders: ['ASC']
            },
            'idx_status': {
                type: 'key',
                attributes: ['status'],
                orders: ['ASC']
            },
            'idx_order_id': {
                type: 'key',
                attributes: ['order_id'],
                orders: ['ASC']
            },
            'idx_created_at': {
                type: 'key',
                attributes: ['created_at'],
                orders: ['DESC']
            },
            'idx_user_status_composite': {
                type: 'key',
                attributes: ['user_id', 'status'],
                orders: ['ASC', 'ASC']
            }
        }
    },
    notifications: {
        name: 'Notifications',
        permissions: ["read(\"any\")", "write(\"any\")"],
        attributes: {
            user_id: { type: 'string', required: true, size: 36 },
            type: { type: 'string', required: true, size: 50, enum: ['order_created', 'payment_success', 'payment_failed', 'progress_update', 'order_completed', 'wallet_deposit', 'support_ticket'] },
            title: { type: 'string', required: true, size: 200 },
            message: { type: 'string', required: true, size: 1000 },
            priority: { type: 'string', required: true, size: 20, enum: ['low', 'medium', 'high'] },
            channels: { type: 'string', required: true, size: 200, array: true, enum: ['email', 'sms', 'push', 'dashboard'] },
            sent_channels: { type: 'string', required: false, size: 200, array: true },
            failed_channels: { type: 'string', required: false, size: 200, array: true },
            metadata: { type: 'string', required: false, size: 2000 },
            is_read: { type: 'boolean', required: true },
            read_at: { type: 'datetime', required: false },
            created_at: { type: 'datetime', required: true }
        },
        indexes: {
            'idx_user_id': {
                type: 'key',
                attributes: ['user_id'],
                orders: ['ASC']
            },
            'idx_type': {
                type: 'key',
                attributes: ['type'],
                orders: ['ASC']
            },
            'idx_is_read': {
                type: 'key',
                attributes: ['is_read'],
                orders: ['ASC']
            },
            'idx_created_at': {
                type: 'key',
                attributes: ['created_at'],
                orders: ['DESC']
            },
            'idx_user_read_composite': {
                type: 'key',
                attributes: ['user_id', 'is_read'],
                orders: ['ASC', 'ASC']
            }
        }
    },
    notification_preferences: {
        name: 'Notification Preferences',
        permissions: ["read(\"any\")", "write(\"any\")"],
        attributes: {
            user_id: { type: 'string', required: true, size: 36 },
            email_preferences: { type: 'string', required: true, size: 1000 },
            sms_preferences: { type: 'string', required: true, size: 1000 },
            push_preferences: { type: 'string', required: true, size: 1000 },
            dashboard_preferences: { type: 'string', required: true, size: 1000 },
            created_at: { type: 'datetime', required: true },
            updated_at: { type: 'datetime', required: true }
        },
        indexes: {
            'idx_user_id': {
                type: 'key',
                attributes: ['user_id'],
                orders: ['ASC']
            }
        }
    },
    enhanced_payment_requests: {
        name: 'Enhanced Payment Requests',
        permissions: ["read(\"any\")", "write(\"any\")"],
        attributes: {
            user_id: { type: 'string', required: true, size: 36 },
            order_id: { type: 'string', required: true, size: 36 },
            authority: { type: 'string', required: true, size: 100 },
            amount: { type: 'float', required: true },
            description: { type: 'string', required: true, size: 500 },
            callback_url: { type: 'string', required: true, size: 500 },
            user_data: { type: 'string', required: false, size: 1000 },
            metadata: { type: 'string', required: false, size: 2000 },
            status: { type: 'string', required: true, size: 20, enum: ['pending', 'completed', 'failed', 'expired'] },
            expires_at: { type: 'datetime', required: true },
            created_at: { type: 'datetime', required: true },
            updated_at: { type: 'datetime', required: true }
        },
        indexes: {
            'idx_user_id': {
                type: 'key',
                attributes: ['user_id'],
                orders: ['ASC']
            },
            'idx_order_id': {
                type: 'key',
                attributes: ['order_id'],
                orders: ['ASC']
            },
            'idx_authority': {
                type: 'key',
                attributes: ['authority'],
                orders: ['ASC']
            },
            'idx_status': {
                type: 'key',
                attributes: ['status'],
                orders: ['ASC']
            },
            'idx_expires_at': {
                type: 'key',
                attributes: ['expires_at'],
                orders: ['ASC']
            }
        }
    },
      // Enhanced Collections for Order Registration & Wallet Management System
          enhanced_orders: {
        name: 'Enhanced Orders',
        permissions: ["read(\"any\")", "write(\"any\")"],
        attributes: {
              user_id: { type: 'string', required: true, size: 36 },
              title: { type: 'string', required: true, size: 255 },
              description: { type: 'string', required: true, size: 1000 },
              price: { type: 'float', required: true },
              site_type: { type: 'string', required: true, size: 20, enum: ['personal', 'business'] },
              status: { type: 'string', required: true, size: 20, enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'] },
              payment_status: { type: 'string', required: true, size: 20, enum: ['pending', 'processing', 'succeeded', 'failed', 'refunded', 'cancelled'] },
              payment_method: { type: 'string', required: false, size: 20, enum: ['wallet', 'zarinpal'] },
              transaction_id: { type: 'string', required: false, size: 100 },
              payment_metadata: { type: 'string', required: false, size: 1000 },
              wizard_data: { type: 'string', required: true, size: 10000 },
              created_at: { type: 'datetime', required: true },
              updated_at: { type: 'datetime', required: true }
          },
          indexes: {
              'idx_user_id': {
                  type: 'key',
                  attributes: ['user_id'],
                  orders: ['ASC']
              },
              'idx_status': {
                  type: 'key',
                  attributes: ['status'],
                  orders: ['ASC']
              },
              'idx_payment_status': {
                  type: 'key',
                  attributes: ['payment_status'],
                  orders: ['ASC']
              },
              'idx_created_at': {
                  type: 'key',
                  attributes: ['created_at'],
                  orders: ['DESC']
              }
          }
      },
          enhanced_wallet_transactions: {
        name: 'Enhanced Wallet Transactions',
        permissions: ["read(\"any\")", "write(\"any\")"],
        attributes: {
              user_id: { type: 'string', required: true, size: 36 },
              type: { type: 'string', required: true, size: 20, enum: ['deposit', 'withdrawal', 'payment', 'refund', 'credit', 'debit'] },
              amount: { type: 'float', required: true },
              description: { type: 'string', required: true, size: 500 },
              status: { type: 'string', required: true, size: 20, enum: ['pending', 'completed', 'failed', 'cancelled'] },
              balance_before: { type: 'float', required: true },
              balance_after: { type: 'float', required: true },
              reference_id: { type: 'string', required: false, size: 100 },
              reference_type: { type: 'string', required: false, size: 50 },
              metadata: { type: 'string', required: false, size: 2000 },
              created_at: { type: 'datetime', required: true }
          },
          indexes: {
              'idx_user_id': {
                  type: 'key',
                  attributes: ['user_id'],
                  orders: ['ASC']
              },
              'idx_type': {
                  type: 'key',
                  attributes: ['type'],
                  orders: ['ASC']
              },
              'idx_status': {
                  type: 'key',
                  attributes: ['status'],
                  orders: ['ASC']
              },
              'idx_reference_id': {
                  type: 'key',
                  attributes: ['reference_id'],
                  orders: ['ASC']
              },
              'idx_created_at': {
                  type: 'key',
                  attributes: ['created_at'],
                  orders: ['DESC']
              },
              'idx_user_type_composite': {
                  type: 'key',
                  attributes: ['user_id', 'type'],
                  orders: ['ASC', 'ASC']
              }
          }
      },
          order_progress: {
        name: 'Order Progress',
        permissions: ["read(\"any\")", "write(\"any\")"],
        attributes: {
              order_id: { type: 'string', required: true, size: 36 },
              user_id: { type: 'string', required: true, size: 36 },
              current_step: { type: 'string', required: true, size: 100 },
              completed_steps: { type: 'string', required: true, size: 1000, array: true },
              remaining_steps: { type: 'string', required: true, size: 1000, array: true },
              progress_percentage: { type: 'integer', required: true, min: 0, max: 100 },
              estimated_delivery: { type: 'datetime', required: true },
              last_update: { type: 'datetime', required: true },
              next_milestone: { type: 'string', required: false, size: 200 },
              timeline: { type: 'string', required: false, size: 5000 },
              notes: { type: 'string', required: false, size: 2000 },
              attachments: { type: 'string', required: false, size: 2000 },
              created_at: { type: 'datetime', required: true },
              updated_at: { type: 'datetime', required: true }
          },
          indexes: {
              'idx_order_id': {
                  type: 'key',
                  attributes: ['order_id'],
                  orders: ['ASC']
              },
              'idx_user_id': {
                  type: 'key',
                  attributes: ['user_id'],
                  orders: ['ASC']
              },
              'idx_current_step': {
                  type: 'key',
                  attributes: ['current_step'],
                  orders: ['ASC']
              },
              'idx_progress_percentage': {
                  type: 'key',
                  attributes: ['progress_percentage'],
                  orders: ['ASC']
              }
          }
      },
          support_tickets: {
        name: 'Support Tickets',
        permissions: ["read(\"any\")", "write(\"any\")"],
        attributes: {
              user_id: { type: 'string', required: true, size: 36 },
              type: { type: 'string', required: true, size: 30, enum: ['payment_failed', 'order_problem', 'wallet_issue', 'technical_problem', 'other'] },
              order_id: { type: 'string', required: false, size: 36 },
              transaction_id: { type: 'string', required: false, size: 100 },
              description: { type: 'string', required: true, size: 2000 },
              priority: { type: 'string', required: true, size: 20, enum: ['low', 'medium', 'high', 'urgent'] },
              status: { type: 'string', required: true, size: 20, enum: ['open', 'in_progress', 'resolved', 'closed'] },
              attachments: { type: 'string', required: false, size: 2000 },
              contact_preference: { type: 'string', required: true, size: 20, enum: ['email', 'phone', 'dashboard'] },
              user_agent: { type: 'string', required: true, size: 500 },
              ip_address: { type: 'string', required: true, size: 45 },
              estimated_resolution: { type: 'string', required: false, size: 100 },
              assigned_to: { type: 'string', required: false, size: 36 },
              messages: { type: 'string', required: false, size: 10000 },
              created_at: { type: 'datetime', required: true },
              updated_at: { type: 'datetime', required: true }
          },
          indexes: {
              'idx_user_id': {
                  type: 'key',
                  attributes: ['user_id'],
                  orders: ['ASC']
              },
              'idx_type': {
                  type: 'key',
                  attributes: ['type'],
                  orders: ['ASC']
              },
              'idx_priority': {
                  type: 'key',
                  attributes: ['priority'],
                  orders: ['ASC']
              },
              'idx_status': {
                  type: 'key',
                  attributes: ['status'],
                  orders: ['ASC']
              },
              'idx_order_id': {
                  type: 'key',
                  attributes: ['order_id'],
                  orders: ['ASC']
              },
              'idx_created_at': {
                  type: 'key',
                  attributes: ['created_at'],
                  orders: ['DESC']
              },
              'idx_user_status_composite': {
                  type: 'key',
                  attributes: ['user_id', 'status'],
                  orders: ['ASC', 'ASC']
              }
          }
      },
          notifications: {
        name: 'Notifications',
        permissions: ["read(\"any\")", "write(\"any\")"],
        attributes: {
              user_id: { type: 'string', required: true, size: 36 },
              type: { type: 'string', required: true, size: 50, enum: ['order_created', 'payment_success', 'payment_failed', 'progress_update', 'order_completed', 'wallet_deposit', 'support_ticket'] },
              title: { type: 'string', required: true, size: 200 },
              message: { type: 'string', required: true, size: 1000 },
              priority: { type: 'string', required: true, size: 20, enum: ['low', 'medium', 'high'] },
              channels: { type: 'string', required: true, size: 200, array: true, enum: ['email', 'sms', 'push', 'dashboard'] },
              sent_channels: { type: 'string', required: false, size: 200, array: true },
              failed_channels: { type: 'string', required: false, size: 200, array: true },
              metadata: { type: 'string', required: false, size: 2000 },
              is_read: { type: 'boolean', required: true },
              read_at: { type: 'datetime', required: false },
              created_at: { type: 'datetime', required: true }
          },
          indexes: {
              'idx_user_id': {
                  type: 'key',
                  attributes: ['user_id'],
                  orders: ['ASC']
              },
              'idx_type': {
                  type: 'key',
                  attributes: ['type'],
                  orders: ['ASC']
              },
              'idx_is_read': {
                  type: 'key',
                  attributes: ['is_read'],
                  orders: ['ASC']
              },
              'idx_created_at': {
                  type: 'key',
                  attributes: ['created_at'],
                  orders: ['DESC']
              },
              'idx_user_read_composite': {
                  type: 'key',
                  attributes: ['user_id', 'is_read'],
                  orders: ['ASC', 'ASC']
              }
          }
      },
          notification_preferences: {
        name: 'Notification Preferences',
        permissions: ["read(\"any\")", "write(\"any\")"],
        attributes: {
              user_id: { type: 'string', required: true, size: 36 },
              email_preferences: { type: 'string', required: true, size: 1000 },
              sms_preferences: { type: 'string', required: true, size: 1000 },
              push_preferences: { type: 'string', required: true, size: 1000 },
              dashboard_preferences: { type: 'string', required: true, size: 1000 },
              created_at: { type: 'datetime', required: true },
              updated_at: { type: 'datetime', required: true }
          },
          indexes: {
              'idx_user_id': {
                  type: 'key',
                  attributes: ['user_id'],
                  orders: ['ASC']
              }
          }
      },
          enhanced_payment_requests: {
        name: 'Enhanced Payment Requests',
        permissions: ["read(\"any\")", "write(\"any\")"],
        attributes: {
              user_id: { type: 'string', required: true, size: 36 },
              order_id: { type: 'string', required: true, size: 36 },
              authority: { type: 'string', required: true, size: 100 },
              amount: { type: 'float', required: true },
              description: { type: 'string', required: true, size: 500 },
              callback_url: { type: 'string', required: true, size: 500 },
              user_data: { type: 'string', required: false, size: 1000 },
              metadata: { type: 'string', required: false, size: 2000 },
              status: { type: 'string', required: true, size: 20, enum: ['pending', 'completed', 'failed', 'expired'] },
              expires_at: { type: 'datetime', required: true },
              created_at: { type: 'datetime', required: true },
              updated_at: { type: 'datetime', required: true }
          },
          indexes: {
              'idx_user_id': {
                  type: 'key',
                  attributes: ['user_id'],
                  orders: ['ASC']
              },
              'idx_order_id': {
                  type: 'key',
                  attributes: ['order_id'],
                  orders: ['ASC']
              },
              'idx_authority': {
                  type: 'key',
                  attributes: ['authority'],
                  orders: ['ASC']
              },
              'idx_status': {
                  type: 'key',
                  attributes: ['status'],
                  orders: ['ASC']
              },
              'idx_expires_at': {
                  type: 'key',
                  attributes: ['expires_at'],
                  orders: ['ASC']
              }
          }
      }
  };
  
  // Helper function to check if collection exists
  async function collectionExists(collectionId) {
      try {
          await databases.getCollection(APPWRITE_DATABASE_ID, collectionId);
          return true;
      } catch (error) {
          if (error.code === 404) {
              return false;
          }
          throw error;
      }
  }
  
  // Helper function to safely create collection
  async function ensureCollectionExists(collectionId, collectionSchema) {
      try {
          const exists = await collectionExists(collectionId);
          if (!exists) {
              console.log(`Creating collection: ${collectionId}`);
              await databases.createCollection(
                  APPWRITE_DATABASE_ID,
                  collectionId,
                  collectionSchema.name,
                  collectionSchema.permissions || ["read(\"any\")"],
                  collectionSchema.documentSecurity || false,
                  collectionSchema.enabled || true
              );
              console.log(`✅ Collection ${collectionId} created successfully`);
          } else {
              console.log(`✅ Collection ${collectionId} already exists`);
          }
      } catch (error) {
          console.error(`❌ Failed to create collection ${collectionId}:`, error.message);
          throw error;
      }
  }
  
  // Helper function to safely create attribute
  async function ensureAttributeExists(collectionId, attributeKey, attributeConfig) {
      try {
          // Check if attribute exists by trying to get it
          try {
              await databases.getAttribute(APPWRITE_DATABASE_ID, collectionId, attributeKey);
              console.log(`✅ Attribute ${attributeKey} already exists in ${collectionId}`);
              return;
          } catch (error) {
              if (error.code !== 404) {
                  throw error;
              }
          }
  
          // Create attribute based on type
          console.log(`Creating attribute: ${attributeKey} in ${collectionId}`);
          
          switch (attributeConfig.type) {
              case 'string':
                  await databases.createStringAttribute(
                      APPWRITE_DATABASE_ID,
                      collectionId,
                      attributeKey,
                      attributeConfig.size || 255,
                      attributeConfig.required || false,
                      attributeConfig.default,
                      attributeConfig.array || false,
                      attributeConfig.encrypt || false
                  );
                  break;
              case 'integer':
                  await databases.createIntegerAttribute(
                      APPWRITE_DATABASE_ID,
                      collectionId,
                      attributeKey,
                      attributeConfig.required || false,
                      attributeConfig.min,
                      attributeConfig.max,
                      attributeConfig.default,
                      attributeConfig.array || false
                  );
                  break;
              case 'float':
                  await databases.createFloatAttribute(
                      APPWRITE_DATABASE_ID,
                      collectionId,
                      attributeKey,
                      attributeConfig.required || false,
                      attributeConfig.min,
                      attributeConfig.max,
                      attributeConfig.default,
                      attributeConfig.array || false
                  );
                  break;
              case 'boolean':
                  await databases.createBooleanAttribute(
                      APPWRITE_DATABASE_ID,
                      collectionId,
                      attributeKey,
                      attributeConfig.required || false,
                      attributeConfig.default,
                      attributeConfig.array || false
                  );
                  break;
              case 'email':
                  await databases.createEmailAttribute(
                      APPWRITE_DATABASE_ID,
                      collectionId,
                      attributeKey,
                      attributeConfig.required || false,
                      attributeConfig.default,
                      attributeConfig.array || false
                  );
                  break;
              case 'url':
                  await databases.createUrlAttribute(
                      APPWRITE_DATABASE_ID,
                      collectionId,
                      attributeKey,
                      attributeConfig.required || false,
                      attributeConfig.default,
                      attributeConfig.array || false
                  );
                  break;
              case 'datetime':
                  await databases.createDatetimeAttribute(
                      APPWRITE_DATABASE_ID,
                      collectionId,
                      attributeKey,
                      attributeConfig.required || false,
                      attributeConfig.default,
                      attributeConfig.array || false
                  );
                  break;
              case 'ip':
                  await databases.createIpAttribute(
                      APPWRITE_DATABASE_ID,
                      collectionId,
                      attributeKey,
                      attributeConfig.required || false,
                      attributeConfig.default,
                      attributeConfig.array || false
                  );
                  break;
              default:
                  throw new Error(`Unsupported attribute type: ${attributeConfig.type}`);
          }
          
          console.log(`✅ Attribute ${attributeKey} created successfully in ${collectionId}`);
      } catch (error) {
          console.error(`❌ Failed to create attribute ${attributeKey} in ${collectionId}:`, error.message);
          throw error;
      }
  }
  
  // Helper function to safely create index
  async function ensureIndexExists(collectionId, indexKey, indexConfig) {
      try {
          // Check if index exists by trying to get it
          try {
              await databases.getIndex(APPWRITE_DATABASE_ID, collectionId, indexKey);
              console.log(`✅ Index ${indexKey} already exists in ${collectionId}`);
              return;
          } catch (error) {
              if (error.code !== 404) {
                  throw error;
              }
          }
  
          // Create index
          console.log(`Creating index: ${indexKey} in ${collectionId}`);
          await databases.createIndex(
              APPWRITE_DATABASE_ID,
              collectionId,
              indexKey,
              indexConfig.type,
              indexConfig.attributes,
              indexConfig.orders || []
          );
          
          console.log(`✅ Index ${indexKey} created successfully in ${collectionId}`);
      } catch (error) {
          console.error(`❌ Failed to create index ${indexKey} in ${collectionId}:`, error.message);
          throw error;
      }
  }
  
  // Main function to update the schema
  async function updateAppwriteSchema() {
      console.log('🚀 Starting Appwrite Schema Update...\n');
  
      try {
          // Test connection
          console.log('1️⃣ Testing Appwrite connection...');
          const database = await databases.get(APPWRITE_DATABASE_ID);
          console.log(`✅ Connected to database: ${database.name}\n`);
  
          // Resolve target collection IDs from env when provided
          const targetCollections = {
              [process.env.APPWRITE_COLLECTION_INVOICES || 'invoices']: newCollections.invoices,
              [process.env.APPWRITE_COLLECTION_RECEIPTS || 'receipts']: newCollections.receipts,
              [process.env.APPWRITE_COLLECTION_WALLET_ADJUSTMENTS || 'walletAdjustments']: newCollections.walletAdjustments,
              [process.env.APPWRITE_COLLECTION_PROFILES || 'profiles']: newCollections.profiles,
              [process.env.APPWRITE_COLLECTION_ENHANCED_ORDERS || 'enhanced_orders']: newCollections.enhanced_orders,
              [process.env.APPWRITE_COLLECTION_ENHANCED_WALLET_TRANSACTIONS || 'enhanced_wallet_transactions']: newCollections.enhanced_wallet_transactions,
              [process.env.APPWRITE_COLLECTION_ORDER_PROGRESS || 'order_progress']: newCollections.order_progress,
              [process.env.APPWRITE_COLLECTION_SUPPORT_TICKETS || 'support_tickets']: newCollections.support_tickets,
              [process.env.APPWRITE_COLLECTION_NOTIFICATIONS || 'notifications']: newCollections.notifications,
              [process.env.APPWRITE_COLLECTION_NOTIFICATION_PREFERENCES || 'notification_preferences']: newCollections.notification_preferences,
              [process.env.APPWRITE_COLLECTION_ENHANCED_PAYMENT_REQUESTS || 'enhanced_payment_requests']: newCollections.enhanced_payment_requests,
          };
  
          // Create new collections and their schemas
          for (const [collectionId, schema] of Object.entries(targetCollections)) {
              console.log(`2️⃣ Processing new collection: ${collectionId}`);
              
              // Create collection
              await ensureCollectionExists(collectionId, schema);
              
              // Create attributes
              for (const [attributeKey, attributeConfig] of Object.entries(schema.attributes)) {
                  await ensureAttributeExists(collectionId, attributeKey, attributeConfig);
              }
              
              // Create indexes
              if (schema.indexes) {
                  for (const [indexKey, indexConfig] of Object.entries(schema.indexes)) {
                      await ensureIndexExists(collectionId, indexKey, indexConfig);
                  }
              }
              
              console.log(`✅ Collection ${collectionId} setup completed\n`);
          }
  
          console.log('🎉 Appwrite Schema Update Completed Successfully!');
          console.log('\n📋 Summary:');
          console.log(`   - Database: ${database.name} (${APPWRITE_DATABASE_ID})`);
          console.log(`   - New collections added: ${Object.keys(newCollections).length}`);
          console.log(`   - Total new attributes: ${Object.values(newCollections).reduce((sum, schema) => sum + Object.keys(schema.attributes).length, 0)}`);
          console.log(`   - Total new indexes: ${Object.values(newCollections).reduce((sum, schema) => sum + (schema.indexes ? Object.keys(schema.indexes).length : 0), 0)}`);
  
      } catch (error) {
          console.error('❌ Schema update failed:', error.message);
          process.exit(1);
      }
  }
  
  // Run the schema update
  if (require.main === module) {
      updateAppwriteSchema();
  }
  
  module.exports = {
      updateAppwriteSchema,
      newCollections,
      collectionExists,
      ensureCollectionExists,
      ensureAttributeExists,
      ensureIndexExists
  };