/** 
 * The description for the api endpoint at /rootpath/subpathendpoint
 * @path /rootpath/subpathendpoint
 * @method POST
 * @param {string} parameter1 - The first param's description
 * @param {number} parameter2 - The second param's description
 * @param {boolean} [parameter3] - The third param's description
 * @description - the description of the endpoint
 */
export interface RootpathSubpathendpointPostRequest {
  parameter1: string;
  parameter2: number;
  parameter3?: boolean;
}
