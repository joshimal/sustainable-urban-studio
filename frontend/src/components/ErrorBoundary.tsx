import React from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  AlertTitle,
  Stack,
  Divider,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  BugReport as BugReportIcon,
  Home as HomeIcon,
} from '@mui/icons-material';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetErrorBoundary }) => {
  const handleRefresh = () => {
    resetErrorBoundary();
    window.location.reload();
  };

  const handleGoHome = () => {
    resetErrorBoundary();
    window.location.href = '/';
  };

  const isNetworkError = error.message.includes('Network Error') ||
                        error.message.includes('fetch') ||
                        error.message.includes('connect');

  const isDevelopment = import.meta.env.DEV;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      }}
    >
      <Paper
        elevation={8}
        sx={{
          maxWidth: 600,
          width: '100%',
          p: 4,
          borderRadius: 3,
          textAlign: 'center',
        }}
      >
        <BugReportIcon
          sx={{
            fontSize: 64,
            color: 'error.main',
            mb: 2,
          }}
        />

        <Typography variant="h4" gutterBottom color="error">
          Oops! Something went wrong
        </Typography>

        <Typography variant="body1" color="text.secondary" paragraph>
          {isNetworkError
            ? "We're having trouble connecting to our servers. Please check your internet connection and try again."
            : "An unexpected error occurred while loading the application."
          }
        </Typography>

        <Divider sx={{ my: 3 }} />

        {isDevelopment && (
          <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
            <AlertTitle>Development Error Details</AlertTitle>
            <Typography variant="body2" component="pre" sx={{
              fontSize: '0.875rem',
              fontFamily: 'monospace',
              mt: 1,
              overflow: 'auto',
              maxHeight: 200,
            }}>
              {error.message}
              {error.stack && (
                <>
                  <br /><br />
                  Stack trace:
                  <br />
                  {error.stack}
                </>
              )}
            </Typography>
          </Alert>
        )}

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="center"
          sx={{ mt: 3 }}
        >
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            size="large"
          >
            Refresh Page
          </Button>

          <Button
            variant="outlined"
            startIcon={<HomeIcon />}
            onClick={handleGoHome}
            size="large"
          >
            Go to Home
          </Button>
        </Stack>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            mt: 4,
            display: 'block',
          }}
        >
          If this problem persists, please contact support with the error details above.
        </Typography>
      </Paper>
    </Box>
  );
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({
  children,
  fallback = ErrorFallback,
  onError,
}) => {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('🚨 Error Boundary caught an error:', error);
      console.error('📍 Error Info:', errorInfo);
    }

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // In production, you might want to send errors to an error reporting service
    // Example: Sentry, LogRocket, etc.
    // if (import.meta.env.PROD) {
    //   errorReportingService.captureException(error, {
    //     contexts: {
    //       react: {
    //         componentStack: errorInfo.componentStack,
    //       },
    //     },
    //   });
    // }
  };

  return (
    <ReactErrorBoundary
      FallbackComponent={fallback}
      onError={handleError}
      onReset={() => {
        // Clear any cached data or reset state if needed
        console.log('🔄 Error boundary reset');
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
};

// Specific error boundary for async operations
interface AsyncErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: (error: Error) => React.ReactNode;
}

export const AsyncErrorBoundary: React.FC<AsyncErrorBoundaryProps> = ({
  children,
  fallback,
}) => {
  const defaultFallback = (error: Error) => (
    <Alert severity="error" sx={{ m: 2 }}>
      <AlertTitle>Error Loading Content</AlertTitle>
      {error.message}
    </Alert>
  );

  return (
    <ReactErrorBoundary
      FallbackComponent={({ error }) => fallback ? fallback(error) : defaultFallback(error)}
    >
      {children}
    </ReactErrorBoundary>
  );
};

export default ErrorBoundary;