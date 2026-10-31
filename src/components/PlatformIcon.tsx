'use client';
import React from 'react';
import { 
  MessageCircle, 
  Send, 
  Gamepad2, 
  Users, 
  ShieldCheck, 
  Camera, 
  MessageSquare, 
  Globe 
} from 'lucide-react';
import { Platform } from '../types';

interface PlatformIconProps {
  platform: Platform;
  className?: string;
  size?: number;
}

export const PlatformIcon: React.FC<PlatformIconProps> = ({ platform, className = 'w-4 h-4', size }) => {
  const iconProps = { className, ...(size ? { size } : {}) };
  switch (platform) {
    case 'whatsapp':
      return <MessageCircle {...iconProps} />;
    case 'telegram':
      return <Send {...iconProps} />;
    case 'discord':
      return <Gamepad2 {...iconProps} />;
    case 'facebook':
      return <Users {...iconProps} />;
    case 'signal':
      return <ShieldCheck {...iconProps} />;
    case 'snapchat':
      return <Camera {...iconProps} />;
    case 'reddit':
      return <MessageSquare {...iconProps} />;
    default:
      return <Globe {...iconProps} />;
  }
};
