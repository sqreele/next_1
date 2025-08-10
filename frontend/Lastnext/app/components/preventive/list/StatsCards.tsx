'use client';

import { Settings, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Stats } from '@/app/lib/types/filterTypes';

interface StatsCardsProps {
  stats: Stats;
}

export default function StatsCards({ stats }: StatsCardsProps) {
 const cards = [
   {
     label: 'Total',
     value: stats.total,
     icon: Settings,
     color: 'text-blue-600',
     bgColor: 'text-blue-600'
   },
   {
     label: 'Completed',
     value: stats.completed,
     icon: CheckCircle,
     color: 'text-green-600',
     bgColor: 'text-green-600'
   },
   {
     label: 'Pending',
     value: stats.pending,
     icon: Clock,
     color: 'text-yellow-600',
     bgColor: 'text-yellow-600'
   },
   {
     label: 'Overdue',
     value: stats.overdue,
     icon: AlertCircle,
     color: 'text-red-600',
     bgColor: 'text-red-600'
   }
 ];

 return (
   <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
     {cards.map((card) => {
       const Icon = card.icon;
       return (
         <div key={card.label} className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
           <div className="flex items-center">
             <div className="flex-shrink-0">
               <Icon className={`h-8 w-8 ${card.color}`} />
             </div>
             <div className="ml-3">
               <p className="text-sm font-medium text-gray-600">{card.label}</p>
               <p className={`text-2xl font-semibold ${card.bgColor}`}>
                 {card.value}
               </p>
             </div>
           </div>
         </div>
       );
     })}
   </div>
 );
}
