# Frontend Wizard Integration Guide

## Overview
This guide provides comprehensive instructions for integrating the Website Design Wizard system with your frontend application. The Wizard system allows users to create custom websites through a step-by-step process, with real-time pricing calculations and file upload capabilities.

## Table of Contents
1. [Authentication Setup](#authentication-setup)
2. [Wizard Flow Implementation](#wizard-flow-implementation)
3. [API Integration](#api-integration)
4. [File Upload Implementation](#file-upload-implementation)
5. [Real-time Updates](#real-time-updates)
6. [Error Handling](#error-handling)
7. [UI/UX Best Practices](#uiux-best-practices)
8. [Testing](#testing)

## Authentication Setup

### JWT Token Management
```typescript
// Store JWT token after login
localStorage.setItem('jwt_token', response.data.token);

// Add token to all API requests
const headers = {
  'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
  'Content-Type': 'application/json'
};
```

### Session Management for Guest Users
```typescript
// Generate unique session ID for guest users
const generateSessionId = () => {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// Store session ID
const sessionId = generateSessionId();
localStorage.setItem('wizard_session_id', sessionId);
```

## Wizard Flow Implementation

### Step 1: Website Type Selection
```typescript
interface WebsiteTypeStep {
  siteType: 'personal' | 'business';
}

const handleWebsiteTypeSelection = async (siteType: WebsiteTypeStep['siteType']) => {
  try {
    const response = await saveWizardProgress({
      sessionId,
      siteType,
    });
    
    // Navigate to next step
    setCurrentStep(2);
  } catch (error) {
    console.error('Failed to save progress:', error);
  }
};
```

### Step 2: Design Method & Structure
```typescript
interface DesignMethodStep {
  websiteFramework: {
    designMethod: 'template' | 'dynamic';
    dynamicDesign?: {
      pages: Page[];
      currentPageId: string;
    };
  };
}

const handleDesignMethodSelection = async (designMethod: 'template' | 'dynamic') => {
  try {
    const response = await saveWizardProgress({
      sessionId,
      websiteFramework: {
        designMethod,
        dynamicDesign: designMethod === 'dynamic' ? {
          pages: [],
          currentPageId: ''
        } : undefined
      }
    });
    
    setCurrentStep(3);
  } catch (error) {
    console.error('Failed to save progress:', error);
  }
};
```

### Step 3: Branding & Colors
```typescript
interface BrandingStep {
  branding: {
    primaryColor: string;
    customColors: string[];
    fontFamily: string;
  };
}

const handleBrandingSubmit = async (branding: BrandingStep['branding']) => {
  try {
    const response = await saveWizardProgress({
      sessionId,
      branding
    });
    
    setCurrentStep(4);
  } catch (error) {
    console.error('Failed to save progress:', error);
  }
};
```

### Step 4: Additional Services
```typescript
interface AdditionalServicesStep {
  additionalServices: {
    seoOptimization: boolean;
    socialMediaIntegration: boolean;
    analyticsSetup: boolean;
    backupService: boolean;
    maintenancePlan: boolean;
    rushDelivery: boolean;
  };
}

const handleServicesSelection = async (services: AdditionalServicesStep['additionalServices']) => {
  try {
    const response = await saveWizardProgress({
      sessionId,
      additionalServices: services
    });
    
    // Calculate pricing
    const pricing = await calculatePricing({
      additionalServices: services
    });
    
    setPricing(pricing);
    setCurrentStep(5);
  } catch (error) {
    console.error('Failed to save progress:', error);
  }
};
```

### Step 5: Domain Selection
```typescript
interface DomainStep {
  domains: {
    primaryDomain: string;
    additionalDomains: Domain[];
  };
}

const handleDomainSelection = async (domains: DomainStep['domains']) => {
  try {
    // Check domain availability
    const availability = await checkDomainAvailability(
      domains.primaryDomain,
      '.ir'
    );
    
    if (availability.available) {
      const response = await saveWizardProgress({
        sessionId,
        domains
      });
      
      // Recalculate pricing with domain costs
      const pricing = await calculatePricing({
        domains
      });
      
      setPricing(pricing);
      setCurrentStep(6);
    } else {
      setDomainError('Domain not available');
    }
  } catch (error) {
    console.error('Failed to save progress:', error);
  }
};
```

## API Integration

### Core API Functions
```typescript
// API base configuration
const API_BASE = 'https://your-api-domain.com/api/wizard';

// Save wizard progress
export const saveWizardProgress = async (data: SaveProgressDto): Promise<WizardOrderDto> => {
  const response = await fetch(`${API_BASE}/save-progress`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Get wizard progress
export const getWizardProgress = async (sessionId: string, userId?: string): Promise<WizardOrderDto> => {
  const url = userId 
    ? `${API_BASE}/progress/user/${userId}`
    : `${API_BASE}/progress/${sessionId}`;
    
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
    },
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Complete wizard order
export const completeWizardOrder = async (data: CompleteOrderDto): Promise<WizardOrderDto> => {
  const response = await fetch(`${API_BASE}/complete-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Calculate pricing
export const calculatePricing = async (data: CalculatePriceDto): Promise<PricingDto> => {
  const response = await fetch(`${API_BASE}/calculate-price`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};
```

### Domain Management APIs
```typescript
// Get available domain extensions
export const getAvailableDomainExtensions = async (): Promise<DomainExtension[]> => {
  const response = await fetch(`${API_BASE}/domains/extensions`);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Check domain availability
export const checkDomainAvailability = async (
  domain: string, 
  extension: string
): Promise<DomainAvailability> => {
  const response = await fetch(`${API_BASE}/domains/check-availability`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ domain, extension }),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Get domain prices
export const getDomainPrices = async (): Promise<DomainExtension[]> => {
  const response = await fetch(`${API_BASE}/domains/prices`);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};
```

### Order Management APIs
```typescript
// Get user orders
export const getUserOrders = async (userId: string): Promise<WizardOrderDto[]> => {
  const response = await fetch(`${API_BASE}/orders/user/${userId}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
    },
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Update order
export const updateOrder = async (
  orderId: string, 
  data: UpdateOrderDto
): Promise<WizardOrderDto> => {
  const response = await fetch(`${API_BASE}/orders/${orderId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};
```

## File Upload Implementation

### File Upload Component
```typescript
import React, { useState, useRef } from 'react';

interface FileUploadProps {
  orderId: string;
  sessionId: string;
  onUploadComplete: (files: ProjectFile[]) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ orderId, sessionId, onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (files: FileList) => {
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('orderId', orderId);
    formData.append('sessionId', sessionId);
    
    Array.from(files).forEach((file) => {
      formData.append('files', file);
    });

    try {
      const response = await fetch(`${API_BASE}/upload-files`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.uploadedFiles.length > 0) {
        onUploadComplete(result.uploadedFiles);
      }
      
      if (result.errors.length > 0) {
        console.warn('Some files failed to upload:', result.errors);
      }
    } catch (error) {
      console.error('File upload error:', error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    handleFileUpload(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div
      className="file-upload-zone"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,text/*,.doc,.docx"
        onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
        style={{ display: 'none' }}
      />
      
      <div className="upload-content">
        <p>Drag and drop files here or</p>
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          Choose Files
        </button>
        
        {uploading && (
          <div className="upload-progress">
            <div 
              className="progress-bar" 
              style={{ width: `${uploadProgress}%` }}
            />
            <span>Uploading... {uploadProgress}%</span>
          </div>
        )}
      </div>
    </div>
  );
};
```

### File Management
```typescript
// List order files
export const listOrderFiles = async (orderId: string): Promise<ProjectFile[]> => {
  const response = await fetch(`${API_BASE}/orders/${orderId}/files`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
    },
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Delete file
export const deleteFile = async (fileId: string, orderId: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/files/${fileId}?orderId=${orderId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
    },
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
};
```

## Real-time Updates

### Progress Persistence
```typescript
// Auto-save progress every 30 seconds
useEffect(() => {
  const autoSaveInterval = setInterval(() => {
    if (hasUnsavedChanges) {
      saveWizardProgress(currentProgress);
      setHasUnsavedChanges(false);
    }
  }, 30000);

  return () => clearInterval(autoSaveInterval);
}, [hasUnsavedChanges, currentProgress]);

// Save progress on step change
const handleStepChange = async (newStep: number) => {
  if (hasUnsavedChanges) {
    await saveWizardProgress(currentProgress);
    setHasUnsavedChanges(false);
  }
  setCurrentStep(newStep);
};
```

### Session Recovery
```typescript
// Recover progress on page load
useEffect(() => {
  const recoverProgress = async () => {
    const sessionId = localStorage.getItem('wizard_session_id');
    if (sessionId) {
      try {
        const progress = await getWizardProgress(sessionId);
        setCurrentProgress(progress);
        setCurrentStep(determineCurrentStep(progress));
      } catch (error) {
        console.error('Failed to recover progress:', error);
        // Start fresh if recovery fails
        localStorage.removeItem('wizard_session_id');
      }
    }
  };

  recoverProgress();
}, []);

const determineCurrentStep = (progress: WizardOrderDto): number => {
  if (!progress.siteType) return 1;
  if (!progress.websiteFramework) return 2;
  if (!progress.branding) return 3;
  if (!progress.additionalServices) return 4;
  if (!progress.domains) return 5;
  return 6;
};
```

## Error Handling

### Global Error Handler
```typescript
class WizardErrorHandler {
  static handle(error: any, context: string) {
    console.error(`Wizard Error in ${context}:`, error);
    
    if (error.response?.status === 401) {
      // Handle authentication error
      this.handleAuthError();
    } else if (error.response?.status === 403) {
      // Handle permission error
      this.handlePermissionError();
    } else if (error.response?.status === 404) {
      // Handle not found error
      this.handleNotFoundError();
    } else if (error.response?.status >= 500) {
      // Handle server error
      this.handleServerError();
    } else {
      // Handle other errors
      this.handleGenericError(error);
    }
  }

  private static handleAuthError() {
    // Redirect to login or refresh token
    localStorage.removeItem('jwt_token');
    window.location.href = '/login';
  }

  private static handlePermissionError() {
    // Show permission denied message
    this.showNotification('Access denied. Please check your permissions.', 'error');
  }

  private static handleNotFoundError() {
    // Show not found message
    this.showNotification('The requested resource was not found.', 'warning');
  }

  private static handleServerError() {
    // Show server error message
    this.showNotification('Server error. Please try again later.', 'error');
  }

  private static handleGenericError(error: any) {
    // Show generic error message
    const message = error.message || 'An unexpected error occurred.';
    this.showNotification(message, 'error');
  }

  private static showNotification(message: string, type: 'success' | 'warning' | 'error') {
    // Implement your notification system
    console.log(`${type.toUpperCase()}: ${message}`);
  }
}
```

### API Error Handling
```typescript
// Wrapper for API calls with error handling
export const apiCall = async <T>(
  apiFunction: () => Promise<T>,
  context: string
): Promise<T> => {
  try {
    return await apiFunction();
  } catch (error) {
    WizardErrorHandler.handle(error, context);
    throw error;
  }
};

// Usage example
const saveProgress = async (data: SaveProgressDto) => {
  return apiCall(
    () => saveWizardProgress(data),
    'saveWizardProgress'
  );
};
```

## UI/UX Best Practices

### Progress Indicator
```typescript
const ProgressIndicator: React.FC<{ currentStep: number; totalSteps: number }> = ({
  currentStep,
  totalSteps
}) => {
  const steps = [
    'Website Type',
    'Design Method',
    'Branding',
    'Services',
    'Domain',
    'Review'
  ];

  return (
    <div className="progress-indicator">
      {steps.map((step, index) => (
        <div
          key={index}
          className={`step ${index + 1 <= currentStep ? 'completed' : ''} ${
            index + 1 === currentStep ? 'current' : ''
          }`}
        >
          <div className="step-number">{index + 1}</div>
          <div className="step-label">{step}</div>
        </div>
      ))}
    </div>
  );
};
```

### Responsive Design
```css
/* Mobile-first approach */
.wizard-container {
  padding: 1rem;
  max-width: 100%;
}

@media (min-width: 768px) {
  .wizard-container {
    padding: 2rem;
    max-width: 800px;
    margin: 0 auto;
  }
}

@media (min-width: 1024px) {
  .wizard-container {
    max-width: 1000px;
  }
}
```

### Loading States
```typescript
const LoadingSpinner: React.FC<{ loading: boolean; children: React.ReactNode }> = ({
  loading,
  children
}) => {
  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
};
```

## Testing

### Unit Tests
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WizardStep } from './WizardStep';

describe('WizardStep', () => {
  it('should render step content correctly', () => {
    render(<WizardStep step={1} />);
    expect(screen.getByText('Website Type')).toBeInTheDocument();
  });

  it('should handle form submission', async () => {
    const mockOnSubmit = jest.fn();
    render(<WizardStep step={1} onSubmit={mockOnSubmit} />);
    
    fireEvent.click(screen.getByText('Personal'));
    fireEvent.click(screen.getByText('Continue'));
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({ siteType: 'personal' });
    });
  });
});
```

### Integration Tests
```typescript
describe('Wizard API Integration', () => {
  it('should save progress successfully', async () => {
    const mockData = { sessionId: 'test', siteType: 'personal' };
    const response = await saveWizardProgress(mockData);
    
    expect(response.sessionId).toBe('test');
    expect(response.siteType).toBe('personal');
  });

  it('should handle API errors gracefully', async () => {
    // Mock API failure
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    
    await expect(saveWizardProgress({} as any)).rejects.toThrow('Network error');
  });
});
```

### E2E Tests
```typescript
describe('Wizard Flow E2E', () => {
  it('should complete full wizard flow', () => {
    cy.visit('/wizard');
    
    // Step 1: Website Type
    cy.get('[data-testid="personal-site"]').click();
    cy.get('[data-testid="continue-btn"]').click();
    
    // Step 2: Design Method
    cy.get('[data-testid="dynamic-design"]').click();
    cy.get('[data-testid="continue-btn"]').click();
    
    // Continue through all steps...
    
    // Final step: Review and complete
    cy.get('[data-testid="complete-order"]').click();
    cy.url().should('include', '/order-confirmation');
  });
});
```

## Performance Optimization

### Lazy Loading
```typescript
// Lazy load wizard steps
const WizardStep1 = lazy(() => import('./steps/WebsiteTypeStep'));
const WizardStep2 = lazy(() => import('./steps/DesignMethodStep'));
const WizardStep3 = lazy(() => import('./steps/BrandingStep'));

const WizardContainer: React.FC = () => {
  return (
    <Suspense fallback={<LoadingSpinner loading={true} />}>
      {currentStep === 1 && <WizardStep1 />}
      {currentStep === 2 && <WizardStep2 />}
      {currentStep === 3 && <WizardStep3 />}
    </Suspense>
  );
};
```

### Debounced API Calls
```typescript
import { debounce } from 'lodash';

const debouncedSaveProgress = debounce(async (data: SaveProgressDto) => {
  await saveWizardProgress(data);
}, 1000);

// Use debounced function for auto-save
useEffect(() => {
  if (hasUnsavedChanges) {
    debouncedSaveProgress(currentProgress);
  }
}, [currentProgress, hasUnsavedChanges]);
```

## Security Considerations

### Input Validation
```typescript
// Validate all user inputs
const validateInput = (input: any, rules: ValidationRule[]): ValidationResult => {
  const errors: string[] = [];
  
  rules.forEach(rule => {
    if (rule.required && !input) {
      errors.push(`${rule.field} is required`);
    }
    
    if (rule.pattern && !rule.pattern.test(input)) {
      errors.push(`${rule.field} format is invalid`);
    }
    
    if (rule.minLength && input.length < rule.minLength) {
      errors.push(`${rule.field} must be at least ${rule.minLength} characters`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
```

### XSS Prevention
```typescript
// Sanitize user inputs
import DOMPurify from 'dompurify';

const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input);
};

// Use in forms
const handleInputChange = (value: string) => {
  const sanitizedValue = sanitizeInput(value);
  setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
};
```

## Conclusion

This guide provides a comprehensive foundation for implementing the Website Design Wizard system in your frontend application. The system is designed to be:

- **User-friendly**: Intuitive step-by-step process
- **Robust**: Comprehensive error handling and validation
- **Scalable**: Modular architecture for easy maintenance
- **Secure**: Input validation and XSS prevention
- **Performant**: Optimized API calls and lazy loading

For additional support or questions, refer to the API documentation or contact the backend development team.

## Additional Resources

- [API Documentation](./COMPREHENSIVE_API_DOCS.md)
- [Authentication Flow](./FRONTEND_AUTH_FLOW.md)
- [Error Handling Guide](./ERROR_HANDLING_GUIDE.md)
- [UI Component Library](./UI_COMPONENTS.md)
