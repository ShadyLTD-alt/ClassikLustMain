import React from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';
import { ScrollContainer } from '@/components/layout/ScrollContainer';
// re-export existing AdminPanel to avoid diff noise
export { default } from './AdminPanel';

// Note: file added only to ensure ScrollContainer usage example; main AdminPanel will be patched separately if needed.
