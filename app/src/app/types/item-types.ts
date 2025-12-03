export interface Item {
    id: number,
    name: string,
    count: number,
    slot?: ItemSlot,
    slots?: number,
    consumed?: boolean,
    minusOne?: number,
    spent?: boolean,
    resources?: ItemResource,
    resourcesAny?: any[],
    requiredBuilding?: string,
    requiredBuildingLevel?: number,
    actions?: ItemAction[],
    requiredItems?: number[],
    effects?: any,
    actionsBack?: any,
    blueprint?: boolean,
    loss?: boolean,
    persistent?: boolean,
    cost?: number,
    unlockProsperity?: number,
    random?: boolean,
}

export enum ItemSlot {
    Head = 'head',
    Body = 'body',
    Legs = 'legs',
    Onehand = 'onehand',
    Twohand = 'twohand',
    Small = 'small'
}

export interface ItemResource {
    metal?: number;
    lumber?: number;
    hide?: number;
    snowthistle?: number;
    axenut?: number;
    arrowvine?: number;
    rockroot?: number;
    corpsecap?: number;
    flamefruit?: number;
    gold?: number;
}

interface ItemAction {
    type: string,
    value?: any,
    small?: boolean,
    valueType?: string,
    subActions?: any[],
}