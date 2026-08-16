import React from "react";
import {COLORS} from "@/constants/colors";

export function generateThemeVariables(): React.CSSProperties {
    const variables: Record<string, string> = {};

    Object.entries(COLORS).forEach(([key, value]) => {
        if (typeof value === 'string') {
            variables[`--${key}`] = value;
        } else if (typeof value === 'object' && value !== null) {
            Object.entries(value).forEach(([subKey, subValue]) => {
                if (subKey === 'DEFAULT') {
                    variables[`--${key}`] = subValue as string;
                } else {
                    variables[`--${key}-${subKey}`] = subValue as string;
                }
            });
        }
    });

    return variables as React.CSSProperties;
}