namespace Vidyano.ViewModel.Actions
{
    class Filter : QueryAction
    {
        public Filter(Definition definition, PersistentObject parent, Query query)
            : base(definition, parent, query)
        {
            IsVisible = false;
        }
    }
}