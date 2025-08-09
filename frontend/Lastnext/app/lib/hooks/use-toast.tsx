// @/app/lib/hooks/use-toast.tsx
import * as React from "react"
import { Toast, ToastActionElement, ToastProps } from "@/app/components/ui/toast"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 5000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
      id: string
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      id: string
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      id: string
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.id ? { ...t, ...action.toast } : t
        ),
      }

    case actionTypes.DISMISS_TOAST: {
      const { id } = action

      // Cancel any existing timeout
      if (toastTimeouts.has(id)) {
        clearTimeout(toastTimeouts.get(id))
        toastTimeouts.delete(id)
      }

      // Set a timeout to remove the toast
      const timeout = setTimeout(() => {
        dispatch({
          type: actionTypes.REMOVE_TOAST,
          id,
        })
      }, TOAST_REMOVE_DELAY)

      toastTimeouts.set(id, timeout)

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === id
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case actionTypes.REMOVE_TOAST:
      if (toastTimeouts.has(action.id)) {
        clearTimeout(toastTimeouts.get(action.id))
        toastTimeouts.delete(action.id)
      }

      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.id),
      }
  }
}

const listeners: ((state: State) => void)[] = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type ToastInput = Partial<Omit<ToasterToast, "id">>

// Type augmentation for adding the custom methods
interface ToastFunction {
  (props: ToastInput): { id: string; dismiss: () => void; update: (props: ToastInput) => void }
  error: (message: string) => { id: string; dismiss: () => void; update: (props: ToastInput) => void }
  success: (message: string) => { id: string; dismiss: () => void; update: (props: ToastInput) => void }
}

// Create the toast function with the proper type
const toast = (((props: ToastInput) => {
  const id = genId()

  const update = (newProps: ToastInput) =>
    dispatch({
      type: actionTypes.UPDATE_TOAST,
      id,
      toast: newProps,
    })

  const dismiss = () => dispatch({ type: actionTypes.DISMISS_TOAST, id })

  dispatch({
    type: actionTypes.ADD_TOAST,
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    } as ToasterToast,
  })

  return {
    id,
    dismiss,
    update,
  }
}) as ToastFunction)

// Add error and success methods
toast.error = (message: string) => {
  return toast({
    variant: "destructive",
    title: "Error",
    description: message,
  })
}

toast.success = (message: string) => {
  return toast({
    title: "Success",
    description: message,
  })
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (id: string) => dispatch({ type: actionTypes.DISMISS_TOAST, id }),
  }
}

export { useToast, toast }

export type { ToasterToast }