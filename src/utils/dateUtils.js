export const getBusinessDate = () => {
    const now = new Date();
    // If current hour is before 4 AM, it counts as the previous business day
    if (now.getHours() < 4) {
        now.setDate(now.getDate() - 1);
    }
    // Set start of business day to 4 AM
    now.setHours(4, 0, 0, 0);
    return now;
};
