export const getBusinessDate = (): Date => {
    const now = new Date();
    if (now.getHours() < 4) {
        now.setDate(now.getDate() - 1);
    }
    now.setHours(4, 0, 0, 0);
    return now;
};
