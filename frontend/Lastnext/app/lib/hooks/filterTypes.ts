// filterTypes.ts
export interface FilterState {
    status: string;
    frequency: string;
    search: string;
    startDate: string;
    endDate: string;
    page: number;
    pageSize: number;
    machine: string; // Add machine filter
  }
  
  export interface MachineOption {
    id: string;
    label: string;
    name: string;
    machine_id: string;
    count: number;
  }
  
  export interface Stats {
    total: number;
    completed: number;
    overdue: number;
    pending: number;
  }