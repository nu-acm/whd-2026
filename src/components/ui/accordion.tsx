import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion';
import { cn } from '@/lib/utils';
import { ChevronDownIcon } from 'lucide-react';

type RootProps = Omit<AccordionPrimitive.Root.Props, 'className'> & {
  className?: string;
  variant?: 'default' | 'faq' | 'feature';
};
export function Accordion({ className, variant = 'default', ...props }: RootProps) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      data-variant={variant}
      className={cn(
        variant === 'faq'
          ? 'faq-six-list'
          : variant === 'feature'
            ? 'feature-two-questions'
            : 'whd-accordion',
        className,
      )}
      {...props}
    />
  );
}
type ItemProps = Omit<AccordionPrimitive.Item.Props, 'className'> & { className?: string };
export function AccordionItem({ className, ...props }: ItemProps) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn('whd-accordion-item', className)}
      {...props}
    />
  );
}
type TriggerProps = Omit<AccordionPrimitive.Trigger.Props, 'className'> & { className?: string };
export function AccordionTrigger({ className, children, ...props }: TriggerProps) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn('whd-accordion-trigger', className)}
        {...props}
      >
        {children}
        <ChevronDownIcon className="whd-accordion-chevron" aria-hidden="true" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}
type PanelProps = Omit<AccordionPrimitive.Panel.Props, 'className'> & { className?: string };
export function AccordionContent({ className, children, ...props }: PanelProps) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className="whd-accordion-content overflow-hidden text-sm"
      {...props}
    >
      <div className={cn('whd-accordion-inner', className)}>{children}</div>
    </AccordionPrimitive.Panel>
  );
}
