namespace Vidyano.ViewModel.Actions
{
    sealed class viConfigurePO : ActionBase
    {
        public viConfigurePO(Definition definition, PersistentObject parent, Query query)
            : base(definition, parent, query)
        {
            IsVisible = false;
        }
    }
}