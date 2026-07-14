import { apiClient } from "../api-client";
import type { PaginatedResponse } from "@/types/api";

export class BaseService {
  static async get<T>(url: string, params?: any, config?: any): Promise<T> {
    return apiClient.get<T>(url, { params, ...config });
  }

  static async post<T, D = any>(url: string, data?: D, config?: any): Promise<T> {
    return apiClient.post<T>(url, data, config);
  }

  static async put<T, D = any>(url: string, data?: D, config?: any): Promise<T> {
    return apiClient.put<T>(url, data, config);
  }

  static async patch<T, D = any>(url: string, data?: D, config?: any): Promise<T> {
    return apiClient.patch<T>(url, data, config);
  }

  static async delete<T>(url: string, config?: any): Promise<T> {
    return apiClient.delete<T>(url, config);
  }

  static async getList<T>(
    url: string,
    params?: any,
    config?: any,
  ): Promise<PaginatedResponse<T>> {
    return apiClient.get<PaginatedResponse<T>>(url, { params, ...config });
  }
}
