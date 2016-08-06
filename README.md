# Manually implementing MVVM design pattern in JavaScript.

In this repository I've built a web application on top of an application-level structure using the MVVM design pattern.

As you guys may know, just like MVC and MVP, MVVM helps you split your application into three diffrent components. The key diffrence comes down to how those compoments interact with each other.

We establish a two-way data binding between the view and the model by passing a 'data-bind' attribute to the view.

# usage

## .setup()

We instantiate a new model/viewModel using the setup() method.

## .apply()

Wraps the HTML fragment that should be processed by the application.

# Example

const
  model = Model.setup({
    name: 'Adel',
    age: 23
  }),
  view = ViewModel.setup({ model }).apply('#some-elem');

---------------------------------------------------------

My application also supports nested views.

<script type="text/template" class="inner-template">
  <span class="span1" >
    <span class="span2" >So far So good!</span>
  </span>
</script>

<script type='text/template' class='outer-template'>
  <ul>
    <li><%= author %></li>
    <li><%= title %></li>
    <li><%= url %></li>
    <li>
      <span data-bind='template: { \"name\": \".inner-template\" }' ></span>
    </li>
  </ul>
</script>

<div class='wrapper' data-bind='template: { \"name\": \".outer-template\" }' ></div>

const model = Model.setup({
   author: 'Adel',
   title: 'Adel\'s blog',
   url: 'https://Adelsblogs.com'
});

const viewModel = ViewModel.setup({ model });

viewModel.apply('.wrapper');

And here is the final result:
<script type='text/template' class='outer-template'>
  <ul>
    <li><%= author %></li>
    <li><%= title %></li>
    <li><%= url %></li>
    <li>
      <span data-bind='template: { \"name\": \".inner-template\" }' >
        <span class="span1" >
          <span class="span2" >So far So good!</span>
        </span>
      </span>
    </li>
  </ul>
</script>