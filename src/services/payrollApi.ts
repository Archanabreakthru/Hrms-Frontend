import { apiClient } from './apiClient';
import { SalaryStructure } from '../types/hrms';

export const payrollApi = {
  async listSalaryStructures(): Promise<SalaryStructure[]> {
    try {
      const res = await apiClient.request<any[]>('/payroll/structures');
      if (Array.isArray(res)) {
        return res.map((r: any): SalaryStructure => ({
          id: r.id,
          name: r.name,
          description: r.description || '',
          grossMonthly: Number(r.grossMonthly ?? r.grossSalaryMonthly ?? 0),
          ctcAnnual: Number(r.ctcAnnual ?? r.baseSalaryAnnual ?? 0),
          items: Array.isArray(r.items) ? r.items : [],
          isActive: r.isActive !== false,
        }));
      }
      return [];
    } catch (err) {
      console.warn('Failed to fetch salary structures from API:', err);
      return [];
    }
  },

  async createSalaryStructure(data: Partial<SalaryStructure>): Promise<SalaryStructure | null> {
    try {
      const payload = {
        id: data.id,
        name: data.name,
        description: data.description,
        grossMonthly: data.grossMonthly ?? 0,
        ctcAnnual: data.ctcAnnual ?? 0,
        items: data.items ?? [],
        isActive: data.isActive !== false,
      };
      const res = await apiClient.request<any>('/payroll/structures', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res;
    } catch (err) {
      console.error('Failed to create salary structure via API:', err);
      throw err;
    }
  },

  async deleteSalaryStructure(id: string): Promise<boolean> {
    try {
      const res = await apiClient.request<{ deleted: boolean }>(`/payroll/structures/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      return res?.deleted ?? true;
    } catch (err) {
      console.error('Failed to delete salary structure via API:', err);
      throw err;
    }
  }
};
