# InterviewDemo
## Introduction
This demo use Electron, Next.js, Typescript, and FastAPI developed a new WSI image viewer

The requirements are hard to implement within a day, I pick what I believe is the most important part of this project to implement.

I implemented fileload, customTile and segmentation_info backend API.
As for frontend, I implement viewer page with the ability to overlay segmentation. The zoom threshold is set to 10x. If the zoom factor is below threshold centroids is displayed, if the zoom factor is above contour is displayed.
I use batch drawing to avoid lagging in this part.

I believe the hardest part is to implement the viewer, and I managed to achieve it. Other parts is not achieveable due to time constraints.

## Ideas on parts that didn't achieve now
File upload is a complex process for local use app. I currently use a local folder to store the file and use a default file name for fast development.

Since there are too many segmentation within a file. In the example file, there are more than 300k segmentation, listing all may not be a good option, even with pagination. Instead, there should be a grouping option that can group segmentation in 1 cell or certain area in one group, which can be toggle to review.

Management page may show only the segmentation that can be viewed in current viewport. 

User-annotation function is also a time-consuming function to implement. One simple approach is to use a square tool to crop area. The segmentation in this area can be marked as user-defined segmentations, and will be rendered in color that user assigned. In addition, it will be collected to the Management page, maybe for future use.

## Instruction
python version requirement: 3.11

Install python package `pip install -r requirements.txt`

Initialize the app (first-time): `npm i`.

Use `npm start` to run the whole app

## Demo Video
See `InterviewDemo.mp4`