/**
 * Calculates the dynamic color for trees and shrubs based on the current date.
 * @param {string} creationDateISO - The ISO string of the creation date.
 * @returns {string} The calculated hex color code.
 */
export function getTreeShrubColor(creationDateISO) {
  const today = new Date();
  const currentYear = today.getFullYear();

  // Dates for color change
  const may15 = new Date(currentYear, 4, 15); // Month is 0-indexed (4 = May)
  const july20 = new Date(currentYear, 6, 20); // Month is 0-indexed (6 = July)

  // Default color
  const defaultColor = '#005745';
  let color = defaultColor;

  if (today >= may15 && today < july20) {
    color = '#52a300';
  } else if (today >= july20) {
    color = '#a0cc00';
  }

  return color;
}

/**
 * Calculates the dynamic color for lawns based on the number of days since creation.
 * @param {string} creationDateISO - The ISO string of the creation date.
 * @returns {string} The calculated hex color code.
 */
export function getLawnColor(creationDateISO) {
    const colorScheme = [
        '#00FF00', // Day 0-1
        '#24FF00', // Day 2-3
        '#48FF00', // Day 4-5
        '#6DFF00', // Day 6-7
        '#FFFF00', // Day 8-9
        '#FFDA00', // Day 10-11
        '#FFB600', // Day 12-13
        '#FF9100', // Day 14-15
    ];
    const finalColor = '#FF0000'; // Day 16+

    const today = new Date();
    const creationDate = new Date(creationDateISO);

    // To calculate the time difference of two dates
    const timeDiff = today.getTime() - creationDate.getTime();

    // To calculate the no. of days between two dates
    const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));

    if (daysDiff < 16) {
        const colorIndex = Math.floor(daysDiff / 2);
        return colorScheme[colorIndex] || colorScheme[0];
    } else {
        return finalColor;
    }
}