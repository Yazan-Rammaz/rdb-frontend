import React from 'react';

export const HomeIcon = ({ active = false, ...props }: React.SVGProps<SVGSVGElement> & { active?: boolean }) => {
  const fillColor = active ? "#404040" : "transparent"
  const strokeColor = !active ? "#a2a0a0" : "none"
  const fillBgColor = !active ? "#404040" : "transparent"
  return (
  <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 25 25" {...props}>
    <defs>
      <clipPath id="clip-path-home">
        <rect width="25" height="25" transform="translate(0 0.382)" fill={fillBgColor}/>
      </clipPath>
    </defs>
    <g transform="translate(-93 -533.407)">
      <g transform="translate(93 533.025)">
        <g clipPath="url(#clip-path-home)">
          <g transform="translate(-0.102 3.068)">
            <circle cx="0.953" cy="0.953" r="0.953" transform="translate(19.86 8.757)" fill={fillColor} stroke={strokeColor} strokeWidth="0.5"/>
            <path d="M42.081,21.2H37.324a2.868,2.868,0,0,0,0,5.737h4.757a1.166,1.166,0,0,0,1.165-1.165V22.367A1.166,1.166,0,0,0,42.081,21.2Zm-3.23,4.457A1.589,1.589,0,1,1,40.44,24.07,1.591,1.591,0,0,1,38.851,25.659Z" transform="translate(-18.038 -14.36)" fill={fillColor} stroke={strokeColor} strokeWidth="0.5"/>
            <path d="M17.674,17.342a3.508,3.508,0,0,1,3.5-3.5h4V9.644a2.015,2.015,0,0,0-2.012-2.012H3.9A2.015,2.015,0,0,0,1.891,9.644v4.414H4.372L5.2,12.124a.318.318,0,0,1,.293-.193H7.613a1.59,1.59,0,1,1,0,.636H5.7L4.875,14.5a.318.318,0,0,1-.293.193H1.891v2.33h5.72a1.589,1.589,0,1,1,0,.636H1.891v2.33H4.583a.318.318,0,0,1,.293.193L5.7,22.117H7.61a1.588,1.588,0,1,1,0,.636H5.489a.318.318,0,0,1-.293-.193l-.824-1.934H1.891v4.414A2.015,2.015,0,0,0,3.9,27.052H23.161a2.015,2.015,0,0,0,2.012-2.012V20.845h-4A3.508,3.508,0,0,1,17.674,17.342Z" transform="translate(-1.891 -7.632)" fill={fillColor} stroke={strokeColor} strokeWidth="0.5"/>
            <circle cx="0.953" cy="0.953" r="0.953" transform="translate(6.324 13.841)" fill={fillColor} stroke={strokeColor} strokeWidth="0.5"/>
            <circle cx="0.953" cy="0.953" r="0.953" transform="translate(6.324 3.673)" fill={fillColor} stroke={strokeColor} strokeWidth="0.5"/>
            <circle cx="0.953" cy="0.953" r="0.953" transform="translate(6.324 8.757)" fill={fillColor} stroke={strokeColor} strokeWidth="0.5"/>
          </g>
        </g>
      </g>
    </g>
  </svg>
  )
}

export const TransactionIcon = ({ active = false, ...props }: React.SVGProps<SVGSVGElement> & { active?: boolean }) => {
  const fgColor = active ? "#F4F5F5" : "#a2a0a0"
  const bgColor = active ? "#404040" : "#F4F5F5"
  return (
<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 25 25" {...props}>
  <circle cx="12.5" cy="12.5" r="12.5" fill={bgColor} />
  <g id="Group_12972" data-name="Group 12972" transform="translate(-333 -261)">
    <path id="Path_22466_-_Outline" data-name="Path 22466 - Outline" d="M12.5.625A11.875,11.875,0,1,0,24.375,12.5,11.888,11.888,0,0,0,12.5.625M12.5,0A12.5,12.5,0,1,1,0,12.5,12.5,12.5,0,0,1,12.5,0Z" transform="translate(333 261)" fill={fgColor}/>
    <path id="arrow-button" d="M12.261,6.172a.588.588,0,0,1,.832,0l4.159,4.159a.588.588,0,0,1-.832.832L13.265,8.008v9.16a.588.588,0,0,1-1.176,0V8.008L8.933,11.163a.588.588,0,0,1-.832-.832Z" transform="translate(336.994 261.621)" fill={fgColor} fillRule="evenodd"/>
    <path id="arrow-button-2" data-name="arrow-button" d="M12.261,17.584a.588.588,0,0,0,.832,0l4.159-4.159a.588.588,0,0,0-.832-.832l-3.155,3.155V6.588a.588.588,0,0,0-1.176,0v9.16L8.933,12.593a.588.588,0,1,0-.832.832Z" transform="translate(328.658 261.621)" fill={fgColor} fillRule="evenodd"/>
  </g>
</svg>

);
}

export const AddressIcon = ({ active = false, ...props }: React.SVGProps<SVGSVGElement>  & { active?: boolean }) => {
  const fgColor = active ? "#F4F5F5" : "#a2a0a0"
  const bgColor = active ? "#404040" : "#F4F5F5"
  return (
<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 25 25" {...props}>
  <rect width="25" height="25" rx="5" fill={bgColor} />
  <g id="Mask_Group_613" data-name="Mask Group 613">
    <path id="wallet-2" d="M24.166,13.827V8.75a1.231,1.231,0,0,0-.417-.922V4.584a1.25,1.25,0,0,0-1.25-1.25H19.676a5.369,5.369,0,0,0-6.524-1.576A5.409,5.409,0,0,0,4.167,3.334H2.5A2.508,2.508,0,0,0,0,5.834V22.5A2.5,2.5,0,0,0,2.5,25H22.916a1.25,1.25,0,0,0,1.25-1.25V18.673A1.25,1.25,0,0,0,25,17.5V15a1.25,1.25,0,0,0-.833-1.173Zm-1.25-9.243V7.5H20.761a5.442,5.442,0,0,0,.071-.833,5.382,5.382,0,0,0-.611-2.5H22.5A.417.417,0,0,1,22.916,4.584Zm-3.776-.59A4.476,4.476,0,0,1,19.916,7.5h-9A4.579,4.579,0,0,1,19.14,3.994ZM9.166.834A4.57,4.57,0,0,1,12.4,2.169,5.343,5.343,0,0,0,10.071,7.5H5.091A4.572,4.572,0,0,1,9.166.834Zm-8.333,5A1.673,1.673,0,0,1,2.5,4.167H3.9A5.369,5.369,0,0,0,4.164,7.5H2.587A1.732,1.732,0,0,1,.837,5.987a1.282,1.282,0,0,1,0-.15ZM22.916,24.166H2.5A1.667,1.667,0,0,1,.833,22.5V19.166H3.579a.839.839,0,0,1,.642.3l.677.815a1.692,1.692,0,1,0,.642-.531l-.679-.816a1.667,1.667,0,0,0-1.284-.6H.833V16.666H7.976a1.667,1.667,0,1,0,0-.833H.833V14.167H3.579a1.67,1.67,0,0,0,1.283-.6l.68-.817a1.647,1.647,0,0,0,.708.167,1.678,1.678,0,1,0-1.351-.7l-.676.813a.84.84,0,0,1-.644.3H.833V7.667a2.642,2.642,0,0,0,1.754.667H22.916a.417.417,0,0,1,.417.417v5H21.249a2.5,2.5,0,0,0,0,5h2.083v5A.417.417,0,0,1,22.916,24.166ZM6.25,20.416a.833.833,0,1,1-.833.833A.833.833,0,0,1,6.25,20.416Zm2.5-4.167a.833.833,0,1,1,.833.833A.833.833,0,0,1,8.75,16.25Zm-3.333-5a.833.833,0,1,1,.833.833A.833.833,0,0,1,5.416,11.25ZM24.166,17.5a.417.417,0,0,1-.417.417h-2.5a1.667,1.667,0,0,1,0-3.333h2.5a.417.417,0,0,1,.417.417Z" transform="translate(0 0)" fill={fgColor}/>
  </g>
</svg>

);
}
export const SettingIcon = ({ active = false, ...props }: React.SVGProps<SVGSVGElement>  & { active?: boolean }) => {
  const fgColor = active ? "#F4F5F5" : "#a2a0a0"
  const bgColor = active ? "#404040" : "#F4F5F5"
  return (
 <svg id="_25x25_Back" data-name="25x25 Back" xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 25 25" {...props}>
  <rect width="25" height="25" rx="2" fill={bgColor} />
  <g id="Mask_Group_618" data-name="Mask Group 618">
    <g id="settings-11" transform="translate(0 1.251)">
      <path id="Path_22821" data-name="Path 22821" d="M.417,3.332H2.95a2.913,2.913,0,0,0,5.767,0H24.583a.417.417,0,1,0,0-.833H8.717a2.913,2.913,0,0,0-5.767,0H.417a.417.417,0,1,0,0,.833ZM5.833.832A2.083,2.083,0,1,1,3.75,2.916,2.083,2.083,0,0,1,5.833.832Zm0,0" fill={fgColor}/>
      <path id="Path_22822" data-name="Path 22822" d="M.417,11.666h14.2a2.913,2.913,0,0,0,5.767,0h4.2a.417.417,0,1,0,0-.833h-4.2a2.913,2.913,0,0,0-5.767,0H.417a.417.417,0,1,0,0,.833ZM17.5,9.166a2.083,2.083,0,1,1-2.083,2.083A2.083,2.083,0,0,1,17.5,9.166Zm0,0" fill={fgColor}/>
      <path id="Path_22823" data-name="Path 22823" d="M.417,20H5.45a2.913,2.913,0,0,0,5.767,0H24.583a.417.417,0,1,0,0-.833H11.217a2.913,2.913,0,0,0-5.767,0H.417a.417.417,0,1,0,0,.833Zm7.917-2.5A2.083,2.083,0,1,1,6.25,19.582,2.083,2.083,0,0,1,8.333,17.5Zm0,0" fill={fgColor}/>
    </g>
  </g>
</svg>

);
}
