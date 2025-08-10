import { PreventiveMaintenance } from '@/app/lib/preventiveMaintenanceModels';

export function formatDate(dateString: string): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function getFrequencyText(frequency: string): string {
  const frequencyMap: { [key: string]: string } = {
    daily: 'Daily',
    weekly: 'Weekly',
    biweekly: 'Bi-weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    biannually: 'Bi-annually',
    annually: 'Annually',
    custom: 'Custom'
  };
  return frequencyMap[frequency] || frequency;
}

export function getStatusInfo(item: PreventiveMaintenance) {
  if (item.completed_date) {
    return { 
      text: 'Completed', 
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: 'CheckCircle'
    };
  } else if (new Date(item.scheduled_date) < new Date()) {
    return { 
      text: 'Overdue', 
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: 'AlertCircle'
    };
  } else {
    return { 
      text: 'Scheduled', 
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: 'Clock'
    };
  }
}

export function getMachineNames(machines: any): string {
  if (!machines) return 'None';
  
  if (Array.isArray(machines)) {
    if (machines.length === 0) return 'None';
    
    const names = machines
      .map(machine => {
        if (typeof machine === 'string') return machine;
        if (typeof machine === 'object' && machine.name) return machine.name;
        if (typeof machine === 'object' && machine.machine_name) return machine.machine_name;
        return 'Unknown';
      })
      .filter(name => name !== 'Unknown');
    
    return names.length > 0 ? names.join(', ') : 'Unknown';
  }
  
  if (typeof machines === 'object') {
    return machines.name || machines.machine_name || 'Unknown';
  }
  
  if (typeof machines === 'string') {
    return machines;
  }
  
  return 'Unknown';
}
