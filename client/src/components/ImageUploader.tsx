// Replace DialogContent/ScrollArea usages with scroll helpers
import React from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { ScrollDialogContent, GalleryScrollArea } from '@/components';
// ... keep rest of file imports
// NOTE: This patch demonstrates usage; the file was previously updated and already uses ScrollArea in 400px height.
// Here we only swap the components where DialogContent and inner ScrollArea are used.
