namespace Vidyano.ViewModel.Actions
{
    sealed class BulkEdit : QueryAction
    {
        public BulkEdit(Definition definition, PersistentObject parent, Query query)
            : base(definition, parent, query)
        {
            IsVisible = false;
        }
    }
}