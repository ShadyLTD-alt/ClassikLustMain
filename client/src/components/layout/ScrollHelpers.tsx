import { DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

// Utility wrappers to enforce scrollable dialogs consistently
export const ScrollDialogContent: typeof DialogContent = (props: any) => (
  <DialogContent className={`max-w-4xl max-h-[85vh] overflow-hidden ${props.className || ''}`} {...props} />
);

export const GalleryScrollArea: typeof ScrollArea = (props: any) => (
  <ScrollArea className={`h-[60vh] md:h-[70vh] ${props.className || ''}`} {...props} />
);
