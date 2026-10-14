import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import { cn } from '@/lib/utils';
export const Tabs = TabsPrimitive.Root;
export const TabsContent = TabsPrimitive.Panel;
export function TabsList({
  className,
  ...props
}: Omit<TabsPrimitive.List.Props, 'className'> & { className?: string }) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn('whd-tabs-list', className)}
      {...props}
    />
  );
}
export function TabsTrigger({
  className,
  ...props
}: Omit<TabsPrimitive.Tab.Props, 'className'> & { className?: string }) {
  return (
    <TabsPrimitive.Tab data-slot="tabs-trigger" className={cn('whd-tab', className)} {...props} />
  );
}
