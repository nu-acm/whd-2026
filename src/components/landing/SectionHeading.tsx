import { cn } from '@/lib/utils';

type SectionHeadingProps = { title: string; className?: string };

export default function SectionHeading({ title, className }: SectionHeadingProps) {
  return <h2 className={cn('landing-heading', className)}>{title}</h2>;
}
