export async function chooseWorkbench(page,id,value){
 await page.locator('#'+id).click();
 await page.locator('[role=option][data-value="'+value+'"]').click();
}
