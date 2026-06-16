import { cn } from '@/lib/utils'
import { forwardRef } from 'react'
import { cva } from 'class-variance-authority'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as ToastPrimitive from '@radix-ui/react-toast'
import * as SelectPrimitive from '@radix-ui/react-select'
import { ChevronDown, X, Check } from 'lucide-react'

// ── Button ───────────────────────────────────────────────────
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default:   'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
        secondary: 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700',
        outline:   'border border-border bg-transparent hover:bg-muted text-foreground',
        ghost:     'hover:bg-muted text-foreground',
        danger:    'bg-red-600 text-white hover:bg-red-700',
      },
      size: {
        sm:   'h-8 px-3 text-xs',
        md:   'h-9 px-4',
        lg:   'h-10 px-6',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  }
)

export const Button = forwardRef(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
))
Button.displayName = 'Button'

// ── Badge ────────────────────────────────────────────────────
export const Badge = ({ className, children }) => (
  <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', className)}>
    {children}
  </span>
)

// ── Card ─────────────────────────────────────────────────────
export const Card = ({ className, ...props }) => (
  <div className={cn('bg-card border border-border rounded-xl shadow-sm', className)} {...props} />
)
export const CardHeader = ({ className, ...props }) => (
  <div className={cn('px-6 py-4 border-b border-border', className)} {...props} />
)
export const CardContent = ({ className, ...props }) => (
  <div className={cn('px-6 py-4', className)} {...props} />
)
export const CardTitle = ({ className, ...props }) => (
  <h3 className={cn('text-base font-semibold text-foreground', className)} {...props} />
)

// ── Input ─────────────────────────────────────────────────────
export const Input = forwardRef(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'w-full h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground',
      'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition',
      className
    )}
    {...props}
  />
))
Input.displayName = 'Input'

// ── Label ─────────────────────────────────────────────────────
export const Label = ({ className, ...props }) => (
  <label className={cn('text-sm font-medium text-foreground', className)} {...props} />
)

// ── Select ────────────────────────────────────────────────────
export const Select = SelectPrimitive.Root
export const SelectValue = SelectPrimitive.Value

export const SelectTrigger = forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex h-9 w-full items-center justify-between rounded-lg border border-border bg-background px-3 text-sm',
      'focus:outline-none focus:ring-2 focus:ring-brand-500 data-[placeholder]:text-muted-foreground',
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon><ChevronDown className="h-4 w-4 opacity-50" /></SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = 'SelectTrigger'

export const SelectContent = forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        'z-50 min-w-[8rem] overflow-hidden rounded-lg border border-border bg-card shadow-lg',
        'data-[state=open]:animate-fade-in',
        className
      )}
      position="popper" sideOffset={4}
      {...props}
    >
      <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = 'SelectContent'

export const SelectItem = forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center rounded-md py-1.5 pl-8 pr-3 text-sm',
      'hover:bg-muted focus:bg-muted outline-none',
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
      <SelectPrimitive.ItemIndicator><Check className="h-3.5 w-3.5" /></SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = 'SelectItem'

// ── Dialog ────────────────────────────────────────────────────
export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger

export const DialogContent = forwardRef(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-fade-in flex items-center justify-center p-4">
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'relative w-full max-w-lg rounded-xl border border-border bg-card shadow-xl',
          'data-[state=open]:animate-fade-in',
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">
          <X className="h-4 w-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Overlay>
  </DialogPrimitive.Portal>
))
DialogContent.displayName = 'DialogContent'

export const DialogHeader = ({ className, ...props }) => (
  <div className={cn('px-6 pt-6 pb-4', className)} {...props} />
)
export const DialogTitle = ({ className, ...props }) => (
  <DialogPrimitive.Title className={cn('text-lg font-semibold', className)} {...props} />
)
export const DialogFooter = ({ className, ...props }) => (
  <div className={cn('px-6 pb-6 pt-2 flex justify-end gap-2', className)} {...props} />
)

// ── Toast ─────────────────────────────────────────────────────
export const ToastProvider = ToastPrimitive.Provider
export const ToastViewport = () => (
  <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80" />
)

export const Toast = forwardRef(({ className, variant = 'default', title, description, ...props }, ref) => (
  <ToastPrimitive.Root
    ref={ref}
    className={cn(
      'flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-lg',
      'data-[state=open]:animate-fade-in data-[state=closed]:opacity-0',
      variant === 'success' && 'border-green-500/30 bg-green-50 dark:bg-green-950/30',
      variant === 'error'   && 'border-red-500/30 bg-red-50 dark:bg-red-950/30',
      className
    )}
    {...props}
  >
    <div className="flex-1">
      {title       && <ToastPrimitive.Title       className="text-sm font-semibold">{title}</ToastPrimitive.Title>}
      {description && <ToastPrimitive.Description className="text-xs text-muted-foreground mt-0.5">{description}</ToastPrimitive.Description>}
    </div>
    <ToastPrimitive.Close className="opacity-60 hover:opacity-100"><X className="h-3.5 w-3.5" /></ToastPrimitive.Close>
  </ToastPrimitive.Root>
))
Toast.displayName = 'Toast'