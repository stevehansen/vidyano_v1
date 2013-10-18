namespace Vidyano.ViewModel.Actions
{
    sealed class viConfigureQuery : QueryAction
    {
        public viConfigureQuery(Definition definition, PersistentObject parent, Query query)
            : base(definition, parent, query)
        {
            IsVisible = false;
        }
    }
}