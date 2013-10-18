namespace Vidyano.View.Controls
{
    public class PersistentObjectAttributeImage : PersistentObjectAttributeControlBase
    {
        public PersistentObjectAttributeImage()
        {
            DefaultStyleKey = typeof(PersistentObjectAttributeImage);
            SetHookDatavalidationStates(this, true);
        }
    }
}