interface FormFieldProps {
    id: string;
    label: string;
    type?: string;
    error?: string;
  }
  
  export default function FormField({ id, label, type = "text", error }: FormFieldProps) {
    return (
      <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <input
          id={id}
          name={id}
          type={type}
          required
          className={`mt-1 appearance-none rounded-lg relative block w-full px-3 py-2 border ${
            error ? 'border-red-500' : 'border-gray-300'
          } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
          placeholder={label}
        />
      </div>
    );
  }