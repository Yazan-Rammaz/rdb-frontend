import React from 'react';
import Image from 'next/image';

// Import icons
import rdbSvg from '../../assets/icons/rdb.svg';
import ramaaztechSvg from '../../assets/icons/ramaaztech.svg';
import rdbsmallSvg from '../../assets/icons/layout/header/rdbsmall.svg';

// Auth icons (though used elsewhere, good to have available if needed via name)
import changeUserSvg from '../../assets/icons/auth/change_user.svg';
import clearLoginSvg from '../../assets/icons/auth/clear_login.svg';
import enterUserSvg from '../../assets/icons/auth/enterUser.svg';
import forgetPasswordSvg from '../../assets/icons/auth/forget_password.svg';
import lockSvg from '../../assets/icons/auth/lock.svg';
import userSvg from '../../assets/icons/auth/user.svg';


const iconsMap: Record<string, string> = {
  'rdb': rdbSvg,
  'ramaaztech': ramaaztechSvg,
  'rdbsmall': rdbsmallSvg,
  'auth/change_user': changeUserSvg,
  'auth/clear_login': clearLoginSvg,
  'auth/enterUser': enterUserSvg,
  'auth/forget_password': forgetPasswordSvg,
  'auth/lock': lockSvg,
  'auth/user': userSvg,
};

interface IconProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  name: string;
}

export const Icon: React.FC<IconProps> = ({ name, className, ...props }) => {
  const src = iconsMap[name];
  
  if (!src) {
    console.warn(`Icon "${name}" not found in iconsMap`);
    return null;
  }

  // Handle both string paths (local dev) and imported objects (build)
  const imageSrc = typeof src === 'string' ? src : (src as any).src || src;

  return (
    <img 
      src={imageSrc} 
      alt={name} 
      className={className}
      {...props} 
    />
  );
};

export const RdbIcon = (props: Omit<React.ComponentProps<typeof Image>, 'src' | 'alt'>) => (
  <Image 
    src={rdbSvg} 
    alt="RDB Logo" 
    width={155}
    height={141}
    priority
    {...props}
    className={`object-contain ${props.className || ''}`}
  />
);

interface LoaderBarIconProps extends React.SVGProps<SVGSVGElement> {
  percent?: number; // 0 to 100
}

export const LoaderBarIcon = ({ percent = 100, ...props }: LoaderBarIconProps) => {
  // Max width in SVG is 146
  const filledWidth = Math.max(0, Math.min(146, (percent / 100) * 146));

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="147" height="5" viewBox="0 0 147 5" {...props}>
      <g id="Group_11964" data-name="Group 11964" transform="translate(-98 -529)">
        <g id="Group_11963" data-name="Group 11963" transform="translate(98 529)">
          <g id="Rectangle_5503" data-name="Rectangle 5503" fill="none" stroke="#707070" strokeWidth="0.5">
            <rect width="146" height="5" rx="2.5" stroke="none" />
            <rect x="0.25" y="0.25" width="145.5" height="4.5" rx="2.25" fill="none" />
          </g>
          <rect
            id="Rectangle_5504"
            data-name="Rectangle 5504"
            width={filledWidth}
            height="5"
            rx="2.5"
            fill="#3066cc"
          />
        </g>
      </g>
    </svg>
  );
};
