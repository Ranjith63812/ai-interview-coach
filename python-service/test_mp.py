import traceback
try:
    from mediapipe.tasks.python import vision
    from mediapipe.tasks.python import BaseOptions
    import mediapipe as mp
    
    print("vision:", vision)
    print("BaseOptions:", BaseOptions)
    print("Image:", mp.Image)
    print("SUCCESS")
except Exception as e:
    with open('test_err.txt', 'w') as f:
        f.write(traceback.format_exc())
