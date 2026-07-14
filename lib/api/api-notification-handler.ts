import { toast } from "sonner";

export interface ErrorOptions {
  errorTitle?: string;
  errorMessage?: string;
  persistent?: boolean;
}

export class ApiNotificationHandler {
  static handleError(error: any, options: ErrorOptions = {}): void {
    const {
      errorTitle = "Error",
      errorMessage = error?.message || (typeof error === 'string' ? error : "An unexpected error occurred"),
      persistent = false
    } = options;

    toast.error(errorTitle, {
      description: errorMessage,
      duration: persistent ? Infinity : 5000,
      closeButton: true,
    });
  }

  static handleSuccess(title: string, message?: string): void {
    toast.success(title, {
      description: message,
      closeButton: true,
    });
  }
}
